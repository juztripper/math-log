# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build (static generation)
npm run start     # Serve production build
npm run sync      # Sync all content from Notion to local cache
npm run lint      # Lint with Next.js/ESLint
```

## Architecture

**math.log** is a Next.js 14 (App Router) static site that displays Portuguese Mathematics A content (10º and 11º ano) sourced from Notion databases.

### Data flow: Notion → JSON cache → Static pages

1. **Sync** (`src/lib/sync.ts`): Fetches pages and all nested blocks from two Notion databases, writes everything to `src/data/cache.json`. Triggered via `npm run sync` or `POST /api/sync` with Bearer token auth.
2. **Read** (`src/lib/notion.ts`): All data functions read from `cache.json` synchronously — zero Notion API calls at build or runtime. Functions are **not async**.
3. **Render** (`src/components/NotionRenderer.tsx`): Converts raw Notion block objects into HTML string. Handles equations via KaTeX server-side rendering, plus paragraphs, headings, lists, callouts, tables, images, columns, toggles, code blocks.

### Content hierarchy

Pages are grouped: **Ano** (year) → **Tema** (theme) → **Subtema** (sub-theme) → **Pages** (sorted by `ordem` number property).

### Key modules

- `src/lib/types.ts` — Interfaces + constants (theme colors/icons, slug mappings, hardcoded theme/subtema order arrays)
- `src/components/ThemeCard.tsx` — Client component: accordion with single-open behavior, quick-nav pills, URL hash-based auto-open
- `src/components/ContentBar.tsx` — Client component: sticky context bar on content pages (appears on scroll)
- `src/app/api/sync/route.ts` — POST-only, Bearer auth, 1-min rate limit

### Notion schema assumptions

Pages have properties: **Nome** (title), **Tema** (select), **Subtema** (select), **Status** (status), **Ano** (select), **Ordem** (number), **Data** (date). Pages with status "Não Iniciado" or title "Modelo de Conteúdo" are excluded.

## Environment variables

Defined in `.env.local`:

```
NOTION_TOKEN    # Notion integration token
NOTION_DB_10    # Database ID for 10º Ano
NOTION_DB_11    # Database ID for 11º Ano
SYNC_SECRET     # Bearer token for /api/sync endpoint
```
