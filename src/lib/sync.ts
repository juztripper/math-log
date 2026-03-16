import { Client } from "@notionhq/client";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const CACHE_PATH = path.join(process.cwd(), "src", "data", "cache.json");

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

export async function syncFromNotion(): Promise<CacheData> {
  const token = process.env.NOTION_TOKEN;
  const db10 = process.env.NOTION_DB_10;
  const db11 = process.env.NOTION_DB_11;

  if (!token || !db10 || !db11) {
    throw new Error("Missing NOTION_TOKEN, NOTION_DB_10, or NOTION_DB_11");
  }

  const notion = new Client({ auth: token });

  console.log("Syncing 10º Ano...");
  const pages10 = await fetchDatabasePages(notion, db10);
  console.log(`  Found ${pages10.length} pages`);

  await sleep(1000);

  console.log("Syncing 11º Ano...");
  const pages11 = await fetchDatabasePages(notion, db11);
  console.log(`  Found ${pages11.length} pages`);

  // Fetch blocks for each page
  const allPages = [
    ...pages10.map((p) => ({ ...p, dbKey: "10" as const })),
    ...pages11.map((p) => ({ ...p, dbKey: "11" as const })),
  ];

  const cached10: CachedPage[] = [];
  const cached11: CachedPage[] = [];

  for (let i = 0; i < allPages.length; i++) {
    const page = allPages[i];
    console.log(`  [${i + 1}/${allPages.length}] ${page.title}`);
    await sleep(400);
    const blocks = await fetchBlocks(notion, page.id);
    const { dbKey, ...rest } = page;
    const cachedPage: CachedPage = { ...rest, blocks };

    if (dbKey === "10") cached10.push(cachedPage);
    else cached11.push(cachedPage);
  }

  const cache: CacheData = {
    lastSync: new Date().toISOString(),
    databases: {
      "10": cached10,
      "11": cached11,
    },
  };

  // Ensure directory exists
  const dir = path.dirname(CACHE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  console.log(`Cache written to ${CACHE_PATH}`);
  console.log(`Last sync: ${cache.lastSync}`);

  return cache;
}
