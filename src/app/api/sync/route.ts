import { NextRequest, NextResponse } from "next/server";
import { syncFromNotion, SyncProgress } from "@/lib/sync";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

let lastSyncTime = 0;
const MIN_INTERVAL_MS = 60_000;

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getAuthToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const token = getAuthToken(request);
  if (!token || !safeCompare(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  if (now - lastSyncTime < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil(
      (MIN_INTERVAL_MS - (now - lastSyncTime)) / 1000
    );
    return NextResponse.json(
      { error: `Rate limited. Try again in ${waitSec}s.` },
      { status: 429 }
    );
  }

  lastSyncTime = now;

  const useSSE = request.headers.get("accept") === "text/event-stream";

  if (!useSSE) {
    // Fallback: non-streaming response
    try {
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
    } catch (err: unknown) {
      console.error("Sync failed:", err);
      return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
  }

  // SSE streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      function send(data: SyncProgress) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      syncFromNotion(send)
        .then((cache) => {
          send({
            phase: "done",
            message: `Concluído: ${cache.databases["10"].length} págs (10.º) + ${cache.databases["11"].length} págs (11.º)`,
          });
          controller.close();
        })
        .catch((err) => {
          send({
            phase: "error",
            message: err?.message || "Erro desconhecido",
          });
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
