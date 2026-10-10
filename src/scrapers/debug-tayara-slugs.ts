import { chromium } from "playwright";

const CANDIDATES: Record<string, string[]> = {
  kairouan: ["kairouan", "kairouen"],
  gabs: ["gabs", "gabes", "gab%C3%A8s"],
  mdenine: ["mdenine", "medenine", "m%C3%A9denine"],
  kebili: ["kebili", "kbeli", "k%C3%A9bili"],
};

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  });
  const page = await context.newPage();

  for (const [label, variants] of Object.entries(CANDIDATES)) {
    console.log(`\n=== ${label} ===`);
    for (const slug of variants) {
      const url = `https://www.tayara.tn/listing/c/v%C3%A9hicules/voitures/l/${slug}/`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page
          .waitForSelector("a[href*='/item/voitures/']", { timeout: 8000, state: "attached" })
          .catch(() => null);
        const count = await page.locator("a[href*='/item/voitures/']").count();
        console.log(`  ${slug}: ${count} items — final URL: ${page.url()}`);
      } catch (err) {
        console.log(`  ${slug}: FAILED (${err})`);
      }
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Debug script failed:", err);
  process.exit(1);
});
