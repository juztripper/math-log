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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
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
  const pageUniques: Record<string, Set<string>> = {};
  const browserUniques: Record<string, Set<string>> = {};
  const osUniques: Record<string, Set<string>> = {};
  const deviceUniques: Record<string, Set<string>> = {};
  const countryUniques: Record<string, Set<string>> = {};
  const cityUniques: Record<string, Set<string>> = {};
  let todayPageViews = 0;

  // Time tracking accumulators
  let totalDuration = 0;
  let eventsWithDuration = 0;
  const pageDurations: Record<string, { total: number; count: number }> = {};
  const pageSessionDurations: Record<string, Record<string, number>> = {};
  const sessionTotalTime: Record<string, number> = {};

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

    (pageUniques[ev.path] ??= new Set()).add(ev.sessionId);
    (browserUniques[ev.browser] ??= new Set()).add(ev.sessionId);
    (osUniques[ev.os] ??= new Set()).add(ev.sessionId);
    (deviceUniques[ev.device] ??= new Set()).add(ev.sessionId);
    (countryUniques[ev.country] ??= new Set()).add(ev.sessionId);
    (cityUniques[ev.city] ??= new Set()).add(ev.sessionId);

    if (day === todayStr) {
      todayPageViews++;
      todaySessions.add(ev.sessionId);
    }

    // Time tracking
    if (ev.duration && ev.duration > 0) {
      totalDuration += ev.duration;
      eventsWithDuration++;

      if (!pageDurations[ev.path]) {
        pageDurations[ev.path] = { total: 0, count: 0 };
      }
      pageDurations[ev.path].total += ev.duration;
      pageDurations[ev.path].count++;

      // Per-session per-page durations
      if (!pageSessionDurations[ev.path]) {
        pageSessionDurations[ev.path] = {};
      }
      pageSessionDurations[ev.path][ev.sessionId] =
        (pageSessionDurations[ev.path][ev.sessionId] || 0) + ev.duration;

      sessionTotalTime[ev.sessionId] =
        (sessionTotalTime[ev.sessionId] || 0) + ev.duration;
    }
  }

  // Compute time metrics
  const avgTimeOnSite =
    eventsWithDuration > 0 ? totalDuration / eventsWithDuration : 0;

  const sessionTimes = Object.values(sessionTotalTime);
  const avgSessionTime =
    sessionTimes.length > 0
      ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length
      : 0;

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

  const sortDesc = (
    obj: Record<string, number>,
    uniq: Record<string, Set<string>>
  ) =>
    Object.entries(obj)
      .map(([name, count]) => ({ name, count, unique: uniq[name]?.size ?? 0 }))
      .sort((a, b) => b.count - a.count);

  // Build top pages with time data
  const topPages = Object.entries(pageCounts)
    .map(([name, count]) => ({
      name,
      count,
      unique: pageUniques[name]?.size ?? 0,
      avgTime: pageDurations[name]
        ? formatDuration(pageDurations[name].total / pageDurations[name].count)
        : "-",
      avgTimePerUser: pageSessionDurations[name]
        ? formatDuration(
            Object.values(pageSessionDurations[name]).reduce((a, b) => a + b, 0) /
              Object.keys(pageSessionDurations[name]).length
          )
        : "-",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return NextResponse.json({
    totalPageViews: events.length,
    uniqueVisitors: uniqueSessions.size,
    todayPageViews,
    todayUniqueVisitors: todaySessions.size,
    avgTimeOnPage: formatDuration(avgTimeOnSite),
    avgSessionTime: formatDuration(avgSessionTime),
    avgTimeOnPageRaw: avgTimeOnSite,
    avgSessionTimeRaw: avgSessionTime,
    viewsByDay: Object.entries(viewsByDay).map(([date, count]) => ({
      date,
      count,
      unique: uniqueByDay[date]?.size ?? 0,
    })),
    topPages,
    browsers: sortDesc(browserCounts, browserUniques),
    os: sortDesc(osCounts, osUniques),
    devices: sortDesc(deviceCounts, deviceUniques),
    countries: sortDesc(countryCounts, countryUniques),
    cities: sortDesc(cityCounts, cityUniques).slice(0, 20),
    lastSync,
  });
}
