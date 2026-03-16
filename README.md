# math.log

Website de conteúdos de Matemática A (10.º e 11.º anos), sincronizado com o Notion.

## Setup

```bash
npm install
```

Cria um ficheiro `.env.local` com:

```env
NOTION_TOKEN=<token da integração Notion>
NOTION_DB_10=<ID da base de dados do 10.º ano>
NOTION_DB_11=<ID da base de dados do 11.º ano>
SYNC_SECRET=<token secreto para o endpoint de sync>
```

## Sincronização de conteúdos

O site lê de um cache local (`src/data/cache.json`), **não** faz chamadas ao Notion em runtime. Para atualizar os conteúdos:

### Localmente (CLI)

```bash
npm run sync
```

### Via API (produção)

```bash
curl -X POST \
  -H "Authorization: Bearer <SYNC_SECRET>" \
  https://<dominio>/api/sync
```

**Detalhes do endpoint:**

| | |
|---|---|
| **Método** | `POST` (GET devolve 405) |
| **Autenticação** | Header `Authorization: Bearer <SYNC_SECRET>` |
| **Rate limit** | 1 request por minuto |
| **Resposta** | `{ ok, lastSync, pages: { "10", "11", total } }` |

O sync demora ~3 minutos (depende do número de páginas e rate limits do Notion).

## Desenvolvimento

```bash
npm run dev       # servidor local em http://localhost:3000
npm run build     # build de produção
npm run start     # servir build de produção
```

## Stack

- **Next.js 14** (App Router, SSG)
- **Notion API** (fonte de dados, via sync)
- **KaTeX** (renderização de fórmulas matemáticas)
- **Tailwind CSS** + CSS custom
