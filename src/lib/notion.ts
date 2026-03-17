import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  ContentPage,
  YearData,
  ThemeGroup,
  SubtemaGroup,
  THEME_COLORS,
  ANO_SLUGS,
} from "./types";
import type { CacheData } from "./sync";

const BUNDLED_CACHE_PATH = path.join(process.cwd(), "src", "data", "cache.json");
const RUNTIME_CACHE_PATH = path.join("/tmp", "cache.json");

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Read from cache ──────────────────────────────
// Prefer runtime cache (/tmp/, written by admin sync) over bundled cache

function readCache(): CacheData | null {
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

export function fetchDatabasePages(dbKey: "10" | "11"): ContentPage[] {
  const cache = readCache();
  if (!cache) return [];
  const pages = cache.databases[dbKey] || [];
  return pages.map(({ blocks, ...rest }) => rest);
}

export interface PageNav {
  prev: { title: string; icon: string; slug: string; subtema: string } | null;
  next: { title: string; icon: string; slug: string; subtema: string } | null;
}

export function fetchPageBySlug(
  dbKey: "10" | "11",
  slug: string
): { page: ContentPage; blocks: any[]; nav: PageNav } | null {
  const cache = readCache();
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
  Array.from(themeMap.values()).forEach((subtemaMap) => {
    Array.from(subtemaMap.values()).forEach((subPages) => {
      subPages.sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
      ordered.push(...subPages);
    });
  });

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

export function fetchAllYearData(): YearData[] {
  const pages10 = fetchDatabasePages("10");
  const pages11 = fetchDatabasePages("11");

  return [
    buildYearData("10º Ano", "10", pages10),
    buildYearData("11º Ano", "11", pages11),
  ];
}

function buildYearData(
  ano: string,
  dbKey: string,
  pages: ContentPage[]
): YearData {
  const themeMap = new Map<string, Map<string, ContentPage[]>>();

  for (const page of pages) {
    const tema = page.tema || "Outros";
    const subtema = page.subtema || "Geral";

    if (!themeMap.has(tema)) themeMap.set(tema, new Map());
    const subtemaMap = themeMap.get(tema)!;
    if (!subtemaMap.has(subtema)) subtemaMap.set(subtema, []);
    subtemaMap.get(subtema)!.push(page);
  }

  const themes: ThemeGroup[] = [];
  Array.from(themeMap.keys()).forEach((tema) => {
    const subtemaMap = themeMap.get(tema)!;

    const subtemas: SubtemaGroup[] = [];
    Array.from(subtemaMap.keys()).forEach((subtema) => {
      const subPages = subtemaMap.get(subtema)!;
      subPages.sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
      subtemas.push({ name: subtema, pages: subPages });
    });

    themes.push({
      name: tema,
      color: THEME_COLORS[tema] || "#6b7280",
      subtemas,
    });
  });

  return {
    ano,
    slug: ANO_SLUGS[ano] || slugify(ano),
    themes,
    totalPages: pages.length,
  };
}

export function getAllSlugs(): { ano: string; slug: string }[] {
  const pages10 = fetchDatabasePages("10");
  const pages11 = fetchDatabasePages("11");

  const slugs: { ano: string; slug: string }[] = [];
  for (const page of pages10) {
    slugs.push({ ano: "10-ano", slug: page.slug });
  }
  for (const page of pages11) {
    slugs.push({ ano: "11-ano", slug: page.slug });
  }
  return slugs;
}
