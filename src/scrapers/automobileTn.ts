import { chromium } from "playwright";
import { ScrapedListing } from "../types";
import { upsertScrapedListing, markMissingAsInactive } from "./upsertListing";

const BASE_URL = "https://www.automobile.tn";
// Confirmed against the live site: /fr/occasion is the real full search
// results page (1,815 listings total), NOT /fr/occasion/recherche, which
// is just a small "featured" carousel. Pagination is via path segments,
// not query params: page 1 = /fr/occasion, page 2 = /fr/occasion/2, etc.
const LISTING_PATH = "/fr/occasion";
const LISTING_LINK_PATTERN = /^\/fr\/occasion\/([a-z0-9-]+)\/([a-z0-9-]+)\/(\d+)$/;
const HEADLESS = process.env.SCRAPE_HEADLESS !== "false";
const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 1500);

const TUNISIA_GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
  "Kairouan", "Kébili", "La Manouba", "Le Kef", "Mahdia", "Médenine",
  "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse",
  "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// Images render asynchronously (owl-carousel init / async src swap) — this
// scrolls through the full page so every card's image has a chance to load
// before we extract, not just the ones visible without scrolling.
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

// Slugs are kebab-case ("mercedes-benz", "range-rover-evoque"). Title-case
// each word so it reads as a normal brand/model name in the DB.
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function detectFuelType(text: string): ScrapedListing["fuelType"] {
  if (/hybride/i.test(text)) return "HYBRID";
  if (/electrique/i.test(text)) return "ELECTRIC";
  if (/diesel/i.test(text)) return "DIESEL";
  if (/essence/i.test(text)) return "PETROL";
  return "UNKNOWN";
}

function detectTransmission(text: string): ScrapedListing["transmission"] {
  if (/automatique/i.test(text)) return "AUTOMATIC";
  if (/manuelle/i.test(text)) return "MANUAL";
  return "UNKNOWN";
}

/**
 * Parses one card's raw inner text + href into the normalized shape.
 * No CSS classes needed: brand/model come from the URL slug, and every
 * other field is pulled from the card's text with regex, since the site
 * renders specs as consistent tokens ("163 000 km", "2007", "Automatique",
 * "13 cv", "Essence", "28 000 DT").
 */
function parseCard(href: string, text: string): ScrapedListing | null {
  const match = href.match(LISTING_LINK_PATTERN);
  if (!match) return null;
  const [, brandSlug, modelSlug, id] = match;

  // Price is always the LAST "<digits> DT" occurrence in the card text —
  // taking the last match avoids accidentally grabbing a phone number or
  // mileage figure that happens to precede it.
  const priceMatches = [...text.matchAll(/(\d[\d\s]{2,8})\s*DT\b/g)];
  const priceRaw = priceMatches.length ? priceMatches[priceMatches.length - 1][1] : "0";
  const price = Number(priceRaw.replace(/\s/g, ""));
  if (!price || price < 500 || price > 3_000_000) return null; // sanity bounds — reject garbage or unpriced cards

  const mileageMatch = text.match(/(\d[\d\s]{2,8})\s*km\b/i);
  const mileageKm = mileageMatch ? Number(mileageMatch[1].replace(/\s/g, "")) : undefined;

  const yearMatch = text.match(/\b(19[5-9]\d|20[0-4]\d)\b/);
  const year = yearMatch ? Number(yearMatch[0]) : undefined;

  const locationMatch = TUNISIA_GOVERNORATES.find((g) => text.includes(g));

  return {
    source: "AUTOMOBILE_TN",
    sourceId: id,
    url: `${BASE_URL}${href}`,
    brandRaw: slugToName(brandSlug),
    modelRaw: slugToName(modelSlug),
    price,
    year,
    mileageKm,
    fuelType: detectFuelType(text),
    transmission: detectTransmission(text),
    location: locationMatch,
    currency: "TND",
  };
}

// NOTE: /fr/occasion has ~1,815 listings across ~121 pages (15/page).
// maxPages defaults to 20 (≈300 listings/run). Push higher once you've
// confirmed the site tolerates it without blocking you.
export async function scrapeAutomobileTn(maxPages = 20) {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  });
  const page = await context.newPage();

  const seenSourceIds: string[] = [];
  let itemsFound = 0;
  let itemsUpserted = 0;

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      // Page 1 is the bare path; page 2+ appends /{pageNum}.
      const url = pageNum === 1 ? `${BASE_URL}${LISTING_PATH}` : `${BASE_URL}${LISTING_PATH}/${pageNum}`;

      let loaded = false;
      for (let attempt = 1; attempt <= 2 && !loaded; attempt++) {
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          loaded = true;
        } catch (err) {
          if (attempt === 2) {
            console.warn(`  page ${pageNum}: failed after retry — ${err}`);
          } else {
            console.warn(`  page ${pageNum}: attempt 1 failed, retrying — ${err}`);
            await sleep(2000);
          }
        }
      }
      if (!loaded) break; // both attempts failed — stop rather than crash the whole run

      // Scroll through the full page so every card's image has a chance to
      // load, not just the ones visible without scrolling.
      await autoScroll(page);

      // Cards live in div.occasion-item-v2. The <a> inside is a transparent
      // overlay with no text — pull href from it, but text from the card div.
      // Confirmed real attribute is plain "src" (see debug-images.ts output).
      const rawCards = await page.$$eval(".occasion-item-v2", (cards) =>
        cards.map((card) => {
          const link = card.querySelector("a.occasion-link-overlay");
          const img = card.querySelector("img");
          const imageURL = img?.getAttribute("src") || undefined;
          return {
            href: link?.getAttribute("href") ?? "",
            text: (card as HTMLElement).innerText ?? "",
            imageURL,
          };
        })
      );

      const pageListings = rawCards
        .map(({ href, text, imageURL }) => {
          const listing = parseCard(href, text);
          if (listing && imageURL) listing.imageURL = imageURL.startsWith("http") ? imageURL : `${BASE_URL}${imageURL}`;
          return listing;
        })
        .filter((x): x is ScrapedListing => x !== null);

      if (pageListings.length === 0) break; // no more pages, or pattern didn't match — check LISTING_PATH first

      for (const item of pageListings) {
        try {
          itemsFound++;
          seenSourceIds.push(item.sourceId);
          await upsertScrapedListing(item);
          itemsUpserted++;
        } catch (err) {
          console.warn(`  skipped ${item.sourceId} (${item.brandRaw} ${item.modelRaw}, ${item.price} DT): ${err}`);
        }
      }

      await sleep(DELAY_MS); // be polite, reduce bot-detection risk
    }

    await markMissingAsInactive("AUTOMOBILE_TN", seenSourceIds);
    console.log(`automobile.tn: found ${itemsFound}, upserted ${itemsUpserted}`);
    return { itemsFound, itemsUpserted };
  } finally {
    await browser.close();
  }
}

// Allow running directly: `npm run scrape:automobile`
if (require.main === module) {
  scrapeAutomobileTn().catch((err) => {
    console.error("automobile.tn scrape failed:", err);
    process.exit(1);
  });
}