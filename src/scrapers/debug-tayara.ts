import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Confirmed real category URL (Tunis-filtered). We'll figure out how to
  // drop the location filter for nationwide coverage once cards work.
  const url = "https://www.tayara.tn/listing/c/v%C3%A9hicules/voitures/l/tunis/";
  console.log("Navigating to:", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log("Page title:", await page.title());

  // Wait for actual listing content instead of network idle — sites with
  // chat widgets/analytics polling often never go fully idle.
  console.log("Waiting for item links to appear...");
  await page.waitForSelector("a[href*='/item/voitures/']", { timeout: 20000, state: "attached" });

  // Item detail links follow /item/voitures/{gov}/{city}/{slug}/{24-char-id}/
  const itemLinkPattern = "a[href*='/item/voitures/']";
  const count = await page.locator(itemLinkPattern).count();
  console.log("Item links found:", count);

  // For the first 3 links, check whether the anchor itself carries the card
  // text (like a normal card) or is an empty overlay (like automobile.tn was).
  const cards = await page.$$eval(itemLinkPattern, (anchors) =>
    anchors.slice(0, 3).map((a) => ({
      href: a.getAttribute("href"),
      innerText: (a as HTMLElement).innerText,
      innerTextLength: (a as HTMLElement).innerText.length,
      outerHTMLPreview: a.outerHTML.slice(0, 400),
    }))
  );
  console.log(JSON.stringify(cards, null, 2));

  // If the anchor is empty, climb up from the FIRST link's parent to find
  // where the real card content lives (same technique that worked for
  // automobile.tn).
  const firstIsEmpty = cards[0]?.innerTextLength === 0;
  if (firstIsEmpty) {
    console.log("\nAnchor text is empty — climbing ancestors to find card content...");
    const climb = await page.$$eval(itemLinkPattern, (anchors) => {
      const a = anchors[0];
      const levels: { level: number; tag: string; className: string; textLength: number; textPreview: string }[] = [];
      let el: HTMLElement | null = a.parentElement;
      let level = 1;
      while (el && level <= 6) {
        const text = el.innerText ?? "";
        levels.push({
          level,
          tag: el.tagName,
          className: el.className,
          textLength: text.length,
          textPreview: text.slice(0, 150),
        });
        el = el.parentElement;
        level++;
      }
      return levels;
    });
    console.log(JSON.stringify(climb, null, 2));
  }

  // Check for pagination controls
  const paginationHTML = await page
    .locator("nav, [class*='pagination'], [class*='pager']")
    .first()
    .evaluate((el) => el.outerHTML.slice(0, 500))
    .catch(() => "no pagination element found");
  console.log("\nPagination area:", paginationHTML);

  await browser.close();
}

main().catch((err) => {
  console.error("Debug script failed:", err);
  process.exit(1);
});
