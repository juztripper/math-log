import { Client } from "@notionhq/client";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";

const CACHE_PATH = path.join(process.cwd(), "src", "data", "cache.json");
const IMAGES_DIR = path.join("/tmp", "images", "notion");

interface CachedPage {
  id: string;
  title: string;
  icon: string;
  slug: string;
  ano: string;
  tema: string;
  subtema: string;
  status: string;
  date: string | null;
  url: string;
  ordem: number | null;
  blocks: any[];
}

export interface CacheData {
  lastSync: string;
  databases: {
    "10": CachedPage[];
    "11": CachedPage[];
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTextProperty(page: any, prop: string): string {
  const p = page.properties[prop];
  if (!p) return "";
  if (p.type === "title") return p.title?.[0]?.plain_text || "";
  if (p.type === "select") return p.select?.name || "";
  if (p.type === "status") return p.status?.name || "";
  if (p.type === "rich_text") return p.rich_text?.[0]?.plain_text || "";
  if (p.type === "date") return p.date?.start || "";
  return "";
}

function getNumberProperty(page: any, prop: string): number | null {
  const p = page.properties[prop];
  if (!p || p.type !== "number") return null;
  return p.number;
}

function getIcon(page: any): string {
  if (page.icon?.type === "emoji") return page.icon.emoji;
  return "📄";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url: string): Promise<string> {
  const hash = crypto.createHash("md5").update(url.split("?")[0]).digest("hex");
  const ext = path.extname(new URL(url).pathname).split("?")[0] || ".png";
  const filename = `${hash}${ext}`;
  const localPath = path.join(IMAGES_DIR, filename);

  if (existsSync(localPath)) {
    return `/api/images/${filename}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  Failed to download image: ${res.status} ${url.slice(0, 80)}...`);
    return url; // fallback to original URL
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buffer);
  return `/api/images/${filename}`;
}

async function downloadBlockImages(blocks: any[]): Promise<void> {
  for (const block of blocks) {
    if (block.type === "image" && block.image?.type === "file") {
      const originalUrl = block.image.file.url;
      block.image.file.url = await downloadImage(originalUrl);
    }
    if (block.children?.length) {
      await downloadBlockImages(block.children);
    }
  }
}

async function fetchBlocks(notion: Client, blockId: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined = undefined;
  let retries = 0;

  do {
    try {
      const response: any = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      });

      for (const block of response.results) {
        if (block.has_children) {
          await sleep(350);
          block.children = await fetchBlocks(notion, block.id);
        }
        blocks.push(block);
      }

      cursor = response.has_more ? response.next_cursor : undefined;
      retries = 0;
    } catch (err: any) {
      if (err?.code === "rate_limited" && retries < 5) {
        retries++;
        console.log(`  Rate limited, waiting ${retries * 3}s...`);
        await sleep(retries * 3000);
        continue;
      }
      throw err;
    }
  } while (cursor);

  return blocks;
}

async function fetchDatabasePages(
  notion: Client,
  dbId: string
): Promise<Omit<CachedPage, "blocks">[]> {
  const pages: Omit<CachedPage, "blocks">[] = [];
  let cursor: string | undefined = undefined;
  let retries = 0;

  do {
    try {
      const response: any = await notion.databases.query({
        database_id: dbId,
        start_cursor: cursor,
        filter: {
          property: "Status",
          status: {
            does_not_equal: "Não Iniciado",
          },
        },
      });

      for (const page of response.results) {
        const title = getTextProperty(page, "Nome");
        if (!title || title === "Modelo de Conteúdo") continue;

        pages.push({
          id: page.id,
          title,
          icon: getIcon(page),
          slug: slugify(title),
          ano: getTextProperty(page, "Ano"),
          tema: getTextProperty(page, "Tema"),
          subtema: getTextProperty(page, "Subtema"),
          status: getTextProperty(page, "Status"),
          date: page.properties.Data?.date?.start || null,
          url: page.url,
          ordem: getNumberProperty(page, "Ordem"),
        });
      }

      cursor = response.has_more ? response.next_cursor : undefined;
      retries = 0;
    } catch (err: any) {
      if (err?.code === "rate_limited" && retries < 5) {
        retries++;
        console.log(`  Rate limited, waiting ${retries * 3}s...`);
        await sleep(retries * 3000);
        continue;
      }
      throw err;
    }
  } while (cursor);

  return pages;
}

export interface SyncProgress {
  phase: "listing" | "blocks" | "images" | "saving" | "done" | "error";
  message: string;
  current?: number;
  total?: number;
  pageTitle?: string;
  imagesDownloaded?: number;
}

type ProgressCallback = (progress: SyncProgress) => void;

function countImages(blocks: any[]): number {
  let count = 0;
  for (const block of blocks) {
    if (block.type === "image" && block.image?.type === "file") count++;
    if (block.children?.length) count += countImages(block.children);
  }
  return count;
}

export async function syncFromNotion(
  onProgress?: ProgressCallback
): Promise<CacheData> {
  const emit = onProgress ?? (() => {});
  const token = process.env.NOTION_TOKEN;
  const db10 = process.env.NOTION_DB_10;
  const db11 = process.env.NOTION_DB_11;

  if (!token || !db10 || !db11) {
    throw new Error("Missing NOTION_TOKEN, NOTION_DB_10, or NOTION_DB_11");
  }

  const notion = new Client({ auth: token });

  emit({ phase: "listing", message: "A obter lista de páginas do 10.º ano..." });
  const pages10 = await fetchDatabasePages(notion, db10);

  await sleep(1000);

  emit({ phase: "listing", message: "A obter lista de páginas do 11.º ano..." });
  const pages11 = await fetchDatabasePages(notion, db11);

  const allPages = [
    ...pages10.map((p) => ({ ...p, dbKey: "10" as const })),
    ...pages11.map((p) => ({ ...p, dbKey: "11" as const })),
  ];

  emit({
    phase: "listing",
    message: `Encontradas ${pages10.length} + ${pages11.length} páginas`,
    total: allPages.length,
  });

  // Ensure images directory exists
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  const cached10: CachedPage[] = [];
  const cached11: CachedPage[] = [];
  let totalImages = 0;

  for (let i = 0; i < allPages.length; i++) {
    const page = allPages[i];
    emit({
      phase: "blocks",
      message: `A obter conteúdo: ${page.title}`,
      current: i + 1,
      total: allPages.length,
      pageTitle: page.title,
    });

    await sleep(400);
    const blocks = await fetchBlocks(notion, page.id);

    const imgCount = countImages(blocks);
    if (imgCount > 0) {
      emit({
        phase: "images",
        message: `A descarregar ${imgCount} imagem(ns) de "${page.title}"`,
        current: i + 1,
        total: allPages.length,
        pageTitle: page.title,
      });
      await downloadBlockImages(blocks);
      totalImages += imgCount;
    }

    const { dbKey, ...rest } = page;
    const cachedPage: CachedPage = { ...rest, blocks };

    if (dbKey === "10") cached10.push(cachedPage);
    else cached11.push(cachedPage);
  }

  emit({ phase: "saving", message: "A guardar cache..." });

  const cache: CacheData = {
    lastSync: new Date().toISOString(),
    databases: {
      "10": cached10,
      "11": cached11,
    },
  };

  const dir = path.dirname(CACHE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");

  emit({
    phase: "done",
    message: `Concluído: ${cached10.length} págs (10.º) + ${cached11.length} págs (11.º), ${totalImages} imagens`,
    imagesDownloaded: totalImages,
  });

  return cache;
}
