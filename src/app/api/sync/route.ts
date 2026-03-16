import { NextRequest, NextResponse } from "next/server";
import { syncFromNotion } from "@/lib/sync";

export const dynamic = "force-dynamic";

// Rate limiting: track last sync time to prevent spam
let lastSyncTime = 0;
const MIN_INTERVAL_MS = 60_000; // 1 minute between syncs

function getAuthToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "SYNC_SECRET not configured" },
      { status: 500 }
    );
  }

  const token = getAuthToken(request);
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const now = Date.now();
  if (now - lastSyncTime < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - lastSyncTime)) / 1000);
    return NextResponse.json(
      { error: `Rate limited. Try again in ${waitSec}s.` },
      { status: 429 }
    );
  }

  try {
    lastSyncTime = now;
    const cache = await syncFromNotion();
    const total =
      cache.databases["10"].length + cache.databases["11"].length;

    return NextResponse.json({
      ok: true,
      lastSync: cache.lastSync,
      pages: {
        "10": cache.databases["10"].length,
        "11": cache.databases["11"].length,
        total,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}

// Block GET requests
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
