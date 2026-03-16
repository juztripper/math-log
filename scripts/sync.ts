import { config } from "dotenv";
config({ path: ".env.local" });
import { syncFromNotion } from "../src/lib/sync";

async function main() {
  console.log("Starting Notion sync...\n");
  const start = Date.now();

  try {
    const cache = await syncFromNotion();
    const total =
      cache.databases["10"].length + cache.databases["11"].length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`\nSync complete in ${elapsed}s`);
    console.log(`  10º Ano: ${cache.databases["10"].length} pages`);
    console.log(`  11º Ano: ${cache.databases["11"].length} pages`);
    console.log(`  Total: ${total} pages`);
  } catch (err) {
    console.error("Sync failed:", err);
    process.exit(1);
  }
}

main();
