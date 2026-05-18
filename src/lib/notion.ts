import { readFileSync, existsSync } from "fs";
import path from "path";
import { list } from "@vercel/blob";
import {
  ContentPage,
  YearData,
  ThemeGroup,
  SubtemaGroup,
  THEME_COLORS,
  ANO_SLUGS,
} from "./types";
import type { CacheData } from "./sync";
import { CACHE_BLOB_PATH } from "./sync";

const BUNDLED_CACHE_PATH = path.join(process.cwd(), "src", "data", "cache.json");
const RUNTIME_CACHE_PATH = path.join("/tmp", "cache.json");

const isVercel = !!process.env.VERCEL;
const MEM_TTL_MS = 30_000;

export const CACHE_TAG = "notion-cache";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function minOrdem(pages: Pick<ContentPage, "ordem">[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const p of pages) {
    const o = p.ordem;
    if (o != null && o < min) min = o;
  }
  return min;
}

export function sortedTemas(
  themeMap: Map<string, Map<string, Pick<ContentPage, "ordem">[]>>
): string[] {
  return Array.from(themeMap.entries())
    .map(([tema, subMap]) => {
      const all: Pick<ContentPage, "ordem">[] = [];
      for (const pages of subMap.values()) all.push(...pages);
      return { tema, min: minOrdem(all) };
    })
    .sort((a, b) =>
      a.min !== b.min ? a.min - b.min : a.tema.localeCompare(b.tema, "pt")
    )
    .map((x) => x.tema);
}

export function sortedSubtemas(
  subMap: Map<string, Pick<ContentPage, "ordem">[]>
): string[] {
  return Array.from(subMap.entries())
    .map(([subtema, pages]) => ({ subtema, min: minOrdem(pages) }))
    .sort((a, b) =>
      a.min !== b.min ? a.min - b.min : a.subtema.localeCompare(b.subtema, "pt")
    )
    .map((x) => x.subtema);
}

// ─── Read from cache ──────────────────────────────
// On Vercel: fetch from Vercel Blob (shared across function instances).
// Locally / at build: read from bundled or /tmp filesystem.
// Cached via unstable_cache; invalidated by revalidateTag(CACHE_TAG) after sync.

function readFromFilesystem(): CacheData | null {
  for (const cachePath of [RUNTIME_CACHE_PATH, BUNDLED_CACHE_PATH]) {
    if (!existsSync(cachePath)) continue;
    try {
      const raw = readFileSync(cachePath, "utf-8");
      return JSON.parse(raw) as CacheData;
    } catch {
      continue;
    }
  }
  return null;
}

async function readFromBlob(): Promise<CacheData | null> {
  try {
    const { blobs } = await list({ prefix: CACHE_BLOB_PATH, limit: 1 });
    const match = blobs.find((b) => b.pathname === CACHE_BLOB_PATH);
    if (!match) {
      console.warn("[notion] Blob 'cache.json' not found via list()");
      return null;
    }
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[notion] Blob fetch returned ${res.status}`);
      return null;
    }
    const data = (await res.json()) as CacheData;
    console.log(
      `[notion] Loaded cache from Blob: lastSync=${data.lastSync}, ` +
        `10=${data.databases["10"]?.length ?? 0}, 11=${data.databases["11"]?.length ?? 0}`
    );
    return data;
  } catch (err) {
    console.warn("[notion] Blob fetch failed:", err);
    return null;
  }
}

let memCache: { data: CacheData; ts: number } | null = null;
let inflight: Promise<CacheData | null> | null = null;

export function invalidateMemoryCache() {
  memCache = null;
}

async function loadCacheFresh(): Promise<CacheData | null> {
  if (isVercel) {
    const blobData = await readFromBlob();
    if (blobData) return blobData;
    console.warn("[notion] Falling back to bundled filesystem cache");
  }
  return readFromFilesystem();
}

async function readCache(): Promise<CacheData | null> {
  if (memCache && Date.now() - memCache.ts < MEM_TTL_MS) {
    return memCache.data;
  }
  if (inflight) return inflight;
  inflight = loadCacheFresh()
    .then((data) => {
      if (data) memCache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function fetchDatabasePages(
  dbKey: "10" | "11"
): Promise<ContentPage[]> {
  const cache = await readCache();
  if (!cache) return [];
  const pages = cache.databases[dbKey] || [];
  return pages.map(({ blocks, ...rest }) => rest);
}

export interface PageNav {
  prev: { title: string; icon: string; slug: string; subtema: string } | null;
  next: { title: string; icon: string; slug: string; subtema: string } | null;
}

export async function fetchPageBySlug(
  dbKey: "10" | "11",
  slug: string
): Promise<{ page: ContentPage; blocks: any[]; nav: PageNav } | null> {
  const cache = await readCache();
  if (!cache) return null;
  const pages = cache.databases[dbKey] || [];

  // Build flat ordered list grouped by tema → subtema, sorted by ordem
  const themeMap = new Map<string, Map<string, typeof pages>>();
  for (const p of pages) {
    const tema = p.tema || "Outros";
    const subtema = p.subtema || "Geral";
    if (!themeMap.has(tema)) themeMap.set(tema, new Map());
    const sub = themeMap.get(tema)!;
    if (!sub.has(subtema)) sub.set(subtema, []);
    sub.get(subtema)!.push(p);
  }

  const ordered: typeof pages = [];
  for (const tema of sortedTemas(themeMap)) {
    const subtemaMap = themeMap.get(tema)!;
    for (const subtema of sortedSubtemas(subtemaMap)) {
      const subPages = subtemaMap.get(subtema)!;
      subPages.sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
      ordered.push(...subPages);
    }
  }

  const idx = ordered.findIndex((p) => p.slug === slug);
  if (idx === -1) return null;

  const found = ordered[idx];
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx < ordered.length - 1 ? ordered[idx + 1] : null;
  const { blocks, ...pageData } = found;

  return {
    page: pageData,
    blocks: blocks || [],
    nav: {
      prev: prev
        ? { title: prev.title, icon: prev.icon, slug: prev.slug, subtema: prev.subtema }
        : null,
      next: next
        ? { title: next.title, icon: next.icon, slug: next.slug, subtema: next.subtema }
        : null,
    },
  };
}

export async function fetchAllYearData(): Promise<YearData[]> {
  const [pages10, pages11] = await Promise.all([
    fetchDatabasePages("10"),
    fetchDatabasePages("11"),
  ]);

  return [buildYearData("10º Ano", pages10), buildYearData("11º Ano", pages11)];
}

function buildYearData(ano: string, pages: ContentPage[]): YearData {
  const themeMap = new Map<string, Map<string, ContentPage[]>>();

  for (const page of pages) {
    const tema = page.tema || "Outros";
    const subtema = page.subtema || "Geral";

    if (!themeMap.has(tema)) themeMap.set(tema, new Map());
    const subtemaMap = themeMap.get(tema)!;
    if (!subtemaMap.has(subtema)) subtemaMap.set(subtema, []);
    subtemaMap.get(subtema)!.push(page);
  }

  const themes: ThemeGroup[] = sortedTemas(themeMap).map((tema) => {
    const subtemaMap = themeMap.get(tema)!;

    const subtemas: SubtemaGroup[] = sortedSubtemas(subtemaMap).map(
      (subtema) => {
        const subPages = subtemaMap.get(subtema)!;
        subPages.sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
        return { name: subtema, pages: subPages };
      }
    );

    return {
      name: tema,
      color: THEME_COLORS[tema] || "#6b7280",
      subtemas,
    };
  });

  return {
    ano,
    slug: ANO_SLUGS[ano] || slugify(ano),
    themes,
    totalPages: pages.length,
  };
}

export async function getLastSync(): Promise<string | null> {
  const cache = await readCache();
  return cache?.lastSync ?? null;
}

export async function getAllSlugs(): Promise<{ ano: string; slug: string }[]> {
  const [pages10, pages11] = await Promise.all([
    fetchDatabasePages("10"),
    fetchDatabasePages("11"),
  ]);

  const slugs: { ano: string; slug: string }[] = [];
  for (const page of pages10) {
    slugs.push({ ano: "10-ano", slug: page.slug });
  }
  for (const page of pages11) {
    slugs.push({ ano: "11-ano", slug: page.slug });
  }
  return slugs;
}
