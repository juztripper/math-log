import fs from "fs";
import path from "path";

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  path: string;
  referrer: string;
  browser: string;
  os: string;
  device: "desktop" | "tablet" | "mobile";
  country: string;
  city: string;
  sessionId: string;
  duration?: number; // seconds spent on this page
}

interface AnalyticsStore {
  events: AnalyticsEvent[];
}

const DATA_PATH = path.join(process.cwd(), "src", "data", "analytics.json");

// In-memory store — initialized from file once, then kept in memory.
// In dev (single process) this works perfectly.
// On Vercel serverless, data is ephemeral per instance — use Vercel KV for persistence.
let memoryStore: AnalyticsStore | null = null;

function loadStore(): AnalyticsStore {
  if (memoryStore) return memoryStore;
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    memoryStore = JSON.parse(raw);
    return memoryStore!;
  } catch {
    memoryStore = { events: [] };
    return memoryStore;
  }
}

function persistStore(store: AnalyticsStore): void {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(store));
  } catch {
    // Read-only filesystem (Vercel) — silently skip
  }
}

export function recordEvent(event: AnalyticsEvent): void {
  const store = loadStore();
  store.events.push(event);
  // Cap at 50 000 events to prevent unbounded growth
  if (store.events.length > 50_000) {
    store.events = store.events.slice(-50_000);
  }
  memoryStore = store;
  persistStore(store);
}

export function updateEventDuration(eventId: string, duration: number): void {
  const store = loadStore();
  // Search from the end since recent events are more likely
  for (let i = store.events.length - 1; i >= Math.max(0, store.events.length - 500); i--) {
    if (store.events[i].id === eventId) {
      store.events[i].duration = duration;
      memoryStore = store;
      persistStore(store);
      return;
    }
  }
}

export function getEvents(since?: Date): AnalyticsEvent[] {
  const store = loadStore();
  if (!since) return store.events;
  const threshold = since.toISOString();
  return store.events.filter((e) => e.timestamp >= threshold);
}

export function parseUserAgent(ua: string): {
  browser: string;
  os: string;
  device: "desktop" | "tablet" | "mobile";
} {
  let browser = "Outro";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Outro";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod"))
    os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  let device: "desktop" | "tablet" | "mobile" = "desktop";
  if (ua.includes("iPad") || ua.includes("Tablet")) device = "tablet";
  else if (
    ua.includes("Mobile") ||
    ua.includes("iPhone") ||
    ua.includes("iPod") ||
    (ua.includes("Android") && !ua.includes("Tablet"))
  )
    device = "mobile";

  return { browser, os, device };
}

export function generateId(): string {
  return crypto.randomUUID();
}
