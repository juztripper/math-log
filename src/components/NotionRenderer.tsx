import katex from "katex";

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return escapeAttr(url);
    }
    return "";
  } catch {
    // Relative URLs are fine
    if (url.startsWith("/")) return escapeAttr(url);
    return "";
  }
}

const VALID_COLORS = new Set([
  "default", "gray", "brown", "orange", "yellow", "green", "blue", "purple",
  "pink", "red", "gray_background", "brown_background", "orange_background",
  "yellow_background", "green_background", "blue_background", "purple_background",
  "pink_background", "red_background",
]);

function renderRichText(richText: any[]): string {
  if (!richText) return "";
  return richText
    .map((rt: any) => {
      if (rt.type === "equation") {
        try {
          return katex.renderToString(rt.equation.expression, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          return `<code>${escapeHtml(rt.equation.expression)}</code>`;
        }
      }

      let text = rt.plain_text || "";
      text = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const ann = rt.annotations || {};
      if (ann.code) text = `<code class="inline-code">${text}</code>`;
      if (ann.bold) text = `<strong>${text}</strong>`;
      if (ann.italic) text = `<em>${text}</em>`;
      if (ann.strikethrough) text = `<s>${text}</s>`;
      if (ann.underline) text = `<u>${text}</u>`;
      if (ann.color && ann.color !== "default" && VALID_COLORS.has(ann.color)) {
        text = `<span class="notion-color-${ann.color}">${text}</span>`;
      }

      if (rt.href) {
        const href = safeUrl(rt.href);
        if (href) {
          text = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="notion-link">${text}</a>`;
        }
      }

      return text;
    })
    .join("");
}

function renderBlock(block: any, index: number): string {
  const type = block.type;

  switch (type) {
    case "paragraph": {
      const text = renderRichText(block.paragraph.rich_text);
      if (!text.trim()) return '<div class="notion-spacer"></div>';
      return `<p class="notion-paragraph">${text}</p>`;
    }

    case "heading_1": {
      const text = renderRichText(block.heading_1.rich_text);
      const id = escapeAttr(text.replace(/<[^>]*>/g, "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
      return `<h1 id="${id}" class="notion-h1">${text}</h1>`;
    }

    case "heading_2": {
      const text = renderRichText(block.heading_2.rich_text);
      const id = escapeAttr(text.replace(/<[^>]*>/g, "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
      return `<h2 id="${id}" class="notion-h2">${text}</h2>`;
    }

    case "heading_3": {
      const text = renderRichText(block.heading_3.rich_text);
      const id = escapeAttr(text.replace(/<[^>]*>/g, "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
      return `<h3 id="${id}" class="notion-h3">${text}</h3>`;
    }

    case "bulleted_list_item": {
      const text = renderRichText(block.bulleted_list_item.rich_text);
      let children = "";
      if (block.children?.length) {
        children = `<ul class="notion-list">${block.children.map((c: any, i: number) => renderBlock(c, i)).join("")}</ul>`;
      }
      return `<li class="notion-list-item">${text}${children}</li>`;
    }

    case "numbered_list_item": {
      const text = renderRichText(block.numbered_list_item.rich_text);
      let children = "";
      if (block.children?.length) {
        children = `<ol class="notion-list-numbered">${block.children.map((c: any, i: number) => renderBlock(c, i)).join("")}</ol>`;
      }
      return `<li class="notion-list-item-numbered">${text}${children}</li>`;
    }

    case "callout": {
      const icon = block.callout.icon?.emoji || "💡";
      const text = renderRichText(block.callout.rich_text);
      let children = "";
      if (block.children?.length) {
        children = block.children
          .map((c: any, i: number) => renderBlock(c, i))
          .join("");
      }
      return `<div class="notion-callout"><span class="notion-callout-icon">${icon}</span><div class="notion-callout-content">${text}${children}</div></div>`;
    }

    case "quote": {
      const text = renderRichText(block.quote.rich_text);
      return `<blockquote class="notion-quote">${text}</blockquote>`;
    }

    case "equation": {
      try {
        const html = katex.renderToString(block.equation.expression, {
          throwOnError: false,
          displayMode: true,
        });
        return `<div class="notion-equation">${html}</div>`;
      } catch {
        return `<pre class="notion-equation-fallback">${escapeHtml(block.equation.expression)}</pre>`;
      }
    }

    case "divider":
      return '<hr class="notion-divider" />';

    case "image": {
      const url =
        block.image.type === "file"
          ? block.image.file.url
          : block.image.external?.url || "";
      const caption = block.image.caption
        ? renderRichText(block.image.caption)
        : "";
      const safeImgUrl = safeUrl(url);
      const altText = escapeAttr(caption.replace(/<[^>]*>/g, ""));
      return `<figure class="notion-image"><img src="${safeImgUrl}" alt="${altText}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
    }

    case "table": {
      if (!block.children?.length) return "";
      const hasHeader = block.table.has_row_header;
      const rows = block.children.map((row: any, rowIdx: number) => {
        const cells = row.table_row?.cells || [];
        const tag = hasHeader && rowIdx === 0 ? "th" : "td";
        const cellsHtml = cells
          .map((cell: any) => `<${tag}>${renderRichText(cell)}</${tag}>`)
          .join("");
        return `<tr>${cellsHtml}</tr>`;
      });
      const headerRows = hasHeader ? `<thead>${rows[0]}</thead>` : "";
      const bodyRows = hasHeader ? rows.slice(1).join("") : rows.join("");
      return `<div class="notion-table-wrapper"><table class="notion-table">${headerRows}<tbody>${bodyRows}</tbody></table></div>`;
    }

    case "column_list": {
      if (!block.children?.length) return "";
      const cols = block.children
        .map((col: any) => {
          const content = col.children
            ? col.children.map((c: any, i: number) => renderBlock(c, i)).join("")
            : "";
          return `<div class="notion-column">${content}</div>`;
        })
        .join("");
      return `<div class="notion-columns">${cols}</div>`;
    }

    case "column":
      return "";

    case "toggle": {
      const text = renderRichText(block.toggle.rich_text);
      let children = "";
      if (block.children?.length) {
        children = block.children
          .map((c: any, i: number) => renderBlock(c, i))
          .join("");
      }
      return `<details class="notion-toggle"><summary>${text}</summary><div class="notion-toggle-content">${children}</div></details>`;
    }

    case "code": {
      const text = renderRichText(block.code.rich_text);
      const lang = escapeAttr(block.code.language || "");
      return `<pre class="notion-code" data-language="${lang}"><code>${text}</code></pre>`;
    }

    case "bookmark": {
      const url = block.bookmark.url || "";
      const safeBookmark = safeUrl(url);
      return `<a href="${safeBookmark}" target="_blank" rel="noopener noreferrer" class="notion-bookmark">${escapeHtml(url)}</a>`;
    }

    default:
      return "";
  }
}

function wrapLists(html: string): string {
  html = html.replace(
    /(<li class="notion-list-item">[\s\S]*?<\/li>)(?=\s*<li class="notion-list-item">)/g,
    "$1"
  );

  let result = "";
  let inBulletList = false;
  let inNumberedList = false;
  const parts = html.split(/(?=<li class="notion-list-item"|<li class="notion-list-item-numbered"|(?<=<\/li>)(?!<li))/);

  for (const part of parts) {
    if (part.startsWith('<li class="notion-list-item-numbered"')) {
      if (!inNumberedList) {
        if (inBulletList) { result += "</ul>"; inBulletList = false; }
        result += '<ol class="notion-list-numbered">';
        inNumberedList = true;
      }
      result += part;
    } else if (part.startsWith('<li class="notion-list-item"')) {
      if (!inBulletList) {
        if (inNumberedList) { result += "</ol>"; inNumberedList = false; }
        result += '<ul class="notion-list">';
        inBulletList = true;
      }
      result += part;
    } else {
      if (inBulletList) { result += "</ul>"; inBulletList = false; }
      if (inNumberedList) { result += "</ol>"; inNumberedList = false; }
      result += part;
    }
  }
  if (inBulletList) result += "</ul>";
  if (inNumberedList) result += "</ol>";

  return result;
}

export function renderBlocks(blocks: any[]): string {
  const raw = blocks.map((block, i) => renderBlock(block, i)).join("\n");
  return wrapLists(raw);
}

export default function NotionContent({ blocks }: { blocks: any[] }) {
  const html = renderBlocks(blocks);
  return (
    <div
      className="notion-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
