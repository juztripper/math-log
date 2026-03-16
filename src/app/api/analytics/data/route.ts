import { NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/analytics";
import { timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.SYNC_SECRET;

  if (!secret || !auth || !safeCompare(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = getEvents(since);

  // Pre-fill every day bucket
  const viewsByDay: Record<string, number> = {};
  const uniqueByDay: Record<string, Set<string>> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    viewsByDay[key] = 0;
    uniqueByDay[key] = new Set();
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const uniqueSessions = new Set<string>();
  const todaySessions = new Set<string>();
  const pageCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  let todayPageViews = 0;

  for (const ev of events) {
    const day = ev.timestamp.split("T")[0];
    if (day in viewsByDay) {
      viewsByDay[day]++;
      uniqueByDay[day].add(ev.sessionId);
    }

    uniqueSessions.add(ev.sessionId);
    pageCounts[ev.path] = (pageCounts[ev.path] || 0) + 1;
    browserCounts[ev.browser] = (browserCounts[ev.browser] || 0) + 1;
    osCounts[ev.os] = (osCounts[ev.os] || 0) + 1;
    deviceCounts[ev.device] = (deviceCounts[ev.device] || 0) + 1;
    countryCounts[ev.country] = (countryCounts[ev.country] || 0) + 1;
    cityCounts[ev.city] = (cityCounts[ev.city] || 0) + 1;

    if (day === todayStr) {
      todayPageViews++;
      todaySessions.add(ev.sessionId);
    }
  }

  // Read cache.json for lastSync
  let lastSync: string | null = null;
  try {
    const cachePath = path.join(process.cwd(), "src", "data", "cache.json");
    const raw = fs.readFileSync(cachePath, "utf-8");
    const cache = JSON.parse(raw);
    lastSync = cache.lastSync || null;
  } catch {
    // ignore
  }

  const sortDesc = (obj: Record<string, number>) =>
    Object.entries(obj)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalPageViews: events.length,
    uniqueVisitors: uniqueSessions.size,
    todayPageViews,
    todayUniqueVisitors: todaySessions.size,
    viewsByDay: Object.entries(viewsByDay).map(([date, count]) => ({
      date,
      count,
      unique: uniqueByDay[date]?.size ?? 0,
    })),
    topPages: sortDesc(pageCounts).slice(0, 20),
    browsers: sortDesc(browserCounts),
    os: sortDesc(osCounts),
    devices: sortDesc(deviceCounts),
    countries: sortDesc(countryCounts),
    cities: sortDesc(cityCounts).slice(0, 20),
    lastSync,
  });
}
