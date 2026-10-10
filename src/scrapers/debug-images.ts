import { chromium } from "playwright";

async function autoScroll(page: import("playwright").Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight - distance) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
  await page.waitForTimeout(1000);
}

async function inspectImages(
  label: string,
  url: string,
  cardSelector: string,
  headless: boolean
) {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log(`\n=== ${label} (headless=${headless}) ===`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector(cardSelector, { timeout: 20000, state: "attached" }).catch(() => null);
  await autoScroll(page);

  const results = await page.$$eval(cardSelector, (els) =>
    els.slice(0, 10).map((card) => {
      const img = card.querySelector("img");
      return {
        src: img?.getAttribute("src") ?? null,
      };
    })
  );

  const withRealSrc = results.filter((r) => r.src && r.src.startsWith("http")).length;
  console.log(`  ${withRealSrc}/${results.length} cards have a real src`);
  console.log(`  Sample:`, results.slice(0, 3));

  await browser.close();
}

async function main() {
  const automobileUrl = "https://www.automobile.tn/fr/occasion";
  const tayaraUrl = "https://www.tayara.tn/listing/c/v%C3%A9hicules/voitures/l/tunis/";

  await inspectImages("automobile.tn", automobileUrl, ".occasion-item-v2", false);
  await inspectImages("automobile.tn", automobileUrl, ".occasion-item-v2", true);
  await inspectImages("tayara.tn", tayaraUrl, "a[href*='/item/voitures/']", false);
  await inspectImages("tayara.tn", tayaraUrl, "a[href*='/item/voitures/']", true);
}

main().catch((err) => {
  console.error("Debug script failed:", err);
  process.exit(1);
});