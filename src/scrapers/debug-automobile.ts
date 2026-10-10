import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  });
  const page = await context.newPage();

  const url = "https://www.automobile.tn/fr/occasion/recherche";
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  // The link itself is an empty overlay (class="occasion-link-overlay").
  // Walk up its ancestors and record innerText + class at each level to
  // find where the actual card content (title, specs, price) lives.
  const climb = await page.$$eval(
    "a.occasion-link-overlay",
    (anchors) =>
      anchors.slice(0, 2).map((a) => {
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
        return { href: a.getAttribute("href"), levels };
      })
  );

  console.log(JSON.stringify(climb, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error("Debug script failed:", err);
  process.exit(1);
});



