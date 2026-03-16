import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { timingSafeEqual } from "crypto";
import cacheData from "@/data/cache.json";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function getLastEditedTime(
  notion: Client,
  dbId: string
): Promise<string> {
  const response = await notion.databases.query({
    database_id: dbId,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    page_size: 1,
  });

  if (response.results.length === 0) return "";
  return (response.results[0] as any).last_edited_time;
}

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or has the right secret)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    !cronSecret ||
    !authHeader ||
    !safeCompare(authHeader, `Bearer ${cronSecret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.NOTION_TOKEN;
  const db10 = process.env.NOTION_DB_10;
  const db11 = process.env.NOTION_DB_11;
  const deployHook = process.env.VERCEL_DEPLOY_HOOK;

  if (!token || !db10 || !db11) {
    return NextResponse.json(
      { error: "Missing Notion env vars" },
      { status: 500 }
    );
  }

  if (!deployHook) {
    return NextResponse.json(
      { error: "VERCEL_DEPLOY_HOOK not configured" },
      { status: 500 }
    );
  }

  try {
    const notion = new Client({ auth: token });

    // Check last edited time on both databases
    const [lastEdited10, lastEdited11] = await Promise.all([
      getLastEditedTime(notion, db10),
      getLastEditedTime(notion, db11),
    ]);

    const lastSync = (cacheData as any).lastSync as string;
    const lastEditedMax =
      lastEdited10 > lastEdited11 ? lastEdited10 : lastEdited11;

    // If the most recently edited page is newer than our last sync, rebuild
    if (lastEditedMax > lastSync) {
      const hookResponse = await fetch(deployHook, { method: "POST" });

      if (!hookResponse.ok) {
        return NextResponse.json(
          { error: "Failed to trigger deploy hook" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        rebuilt: true,
        reason: "Content changed",
        lastSync,
        lastEdited: lastEditedMax,
      });
    }

    return NextResponse.json({
      rebuilt: false,
      reason: "No changes detected",
      lastSync,
      lastEdited: lastEditedMax,
    });
  } catch (err: unknown) {
    console.error("Cron check failed:", err);
    return NextResponse.json(
      { error: "Cron check failed" },
      { status: 500 }
    );
  }
}
