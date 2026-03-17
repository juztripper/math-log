import { NextRequest } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate block ID format (UUID with or without dashes)
  if (!/^[a-f0-9-]{32,36}$/.test(id)) {
    return new Response("Invalid ID", { status: 400 });
  }

  try {
    // Fetch fresh block data from Notion (gets a new signed URL)
    const block = (await notion.blocks.retrieve({ block_id: id })) as any;

    if (block.type !== "image" || block.image?.type !== "file") {
      return new Response("Not an image", { status: 404 });
    }

    const imageUrl = block.image.file.url;

    // Fetch the image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return new Response("Image fetch failed", { status: 502 });
    }

    const contentType = imgRes.headers.get("content-type") || "image/png";
    const buffer = await imgRes.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
