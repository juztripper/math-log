import { NextRequest, NextResponse } from "next/server";
import { recordEvent, parseUserAgent, generateId } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Simple in-memory rate limit: max 30 events per IP per minute
const ipBuckets = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.reset) {
    ipBuckets.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  try {
    // Basic same-origin check
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { path: pagePath, referrer, sessionId } = body;

    if (!pagePath || typeof pagePath !== "string") {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    // Sanitize inputs
    const safePath = pagePath.slice(0, 500);
    const safeReferrer =
      typeof referrer === "string" ? referrer.slice(0, 1000) : "";
    const safeSession =
      typeof sessionId === "string" ? sessionId.slice(0, 100) : generateId();

    const ua = request.headers.get("user-agent") || "";
    const { browser, os, device } = parseUserAgent(ua);

    const country =
      request.headers.get("x-vercel-ip-country") || "Desconhecido";
    const city =
      request.headers.get("x-vercel-ip-city") || "Desconhecida";

    recordEvent({
      id: generateId(),
      timestamp: new Date().toISOString(),
      path: safePath,
      referrer: safeReferrer,
      browser,
      os,
      device,
      country: decodeURIComponent(country),
      city: decodeURIComponent(city),
      sessionId: safeSession,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
