import { chromium } from "playwright";
import { ScrapedListing } from "../types";
import { upsertScrapedListing, markMissingAsInactive } from "./upsertListing";

const BASE_URL = "https://www.tayara.tn";
// Confirmed against the live site. This is the "Voitures" category filtered
// to Tunis governorate — nationwide coverage needs looping over governorate
// slugs (see GOVERNORATES below), since the site's URL scheme requires one.
const LISTING_PATH = "/listing/c/v%C3%A9hicules/voitures/l";
const ITEM_LINK_PATTERN = /^\/item\/voitures\/[^/]+\/[^/]+\/[^/]+\/([a-f0-9]{20,})\/?$/;
const HEADLESS = process.env.SCRAPE_HEADLESS !== "false";
const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 1500);

// Slugs as used in tayara.tn URLs (confirmed examples: tunis, gabs, mdenine,
// le-kef). Unconfirmed ones are best-effort — scrapeGovernorate() skips any
// that 404 instead of crashing the whole run.
const GOVERNORATES = [
  "tunis", "ariana", "ben-arous", "manouba", "bizerte", "nabeul", "zaghouan",
  "beja", "jendouba", "le-kef", "siliana", "kairouan", "kasserine",
  "sidi-bouzid", "sousse", "monastir", "mahdia", "sfax", "gabs", "mdenine",
  "tataouine", "gafsa", "tozeur", "kebili",
];

// Common brands in the Tunisian market, including short-form aliases people
// actually type ("VW", "MB"). Maps alias -> canonical display name. Matched
// with word boundaries (not plain substring) so 2-letter codes like "DS" or
// "MG" don't false-positive inside unrelated words (e.g. "DS" inside "DSG",
// a transmission type, not the DS brand).
const BRAND_ALIASES: Record<string, string> = {
  "mercedes-benz": "Mercedes-Benz", "mercedes benz": "Mercedes-Benz", mercedes: "Mercedes-Benz", benz: "Mercedes-Benz", mb: "Mercedes-Benz",
  volkswagen: "Volkswagen", vw: "Volkswagen",
  "land rover": "Land Rover", "range rover": "Land Rover",
  "alfa romeo": "Alfa Romeo",
  bmw: "BMW",
  audi: "Audi",
  toyota: "Toyota",
  kia: "Kia",
  hyundai: "Hyundai",
  peugeot: "Peugeot",
  renault: "Renault",
  citroen: "Citroen", "citroën": "Citroen",
  fiat: "Fiat",
  suzuki: "Suzuki",
  nissan: "Nissan",
  ford: "Ford",
  opel: "Opel",
  dacia: "Dacia",
  skoda: "Skoda",
  seat: "Seat",
  mitsubishi: "Mitsubishi",
  honda: "Honda",
  chery: "Chery",
  mg: "MG",
  isuzu: "Isuzu",
  porsche: "Porsche",
  volvo: "Volvo",
  jeep: "Jeep",
  chevrolet: "Chevrolet",
  mazda: "Mazda",
  mini: "Mini",
  jaguar: "Jaguar",
  subaru: "Subaru",
  lexus: "Lexus",
  ds: "DS",
  geely: "Geely",
  haval: "Haval",
  jac: "JAC",
  changan: "Changan",
  byd: "BYD",
  gac: "GAC",
  dfsk: "DFSK",
  ssangyong: "SsangYong",
  iveco: "Iveco",
  "great wall": "Great Wall",
  mahindra: "Mahindra", mahinrda: "Mahindra",
};
// Longest alias first, so "land rover" matches before a hypothetical shorter
// overlapping alias would.
const SORTED_ALIASES = Object.keys(BRAND_ALIASES).sort((a, b) => b.length - a.length);

// Sellers very often write just the model or model code, not the brand
// (e.g. "Golf 5", "A4 2016", "Classe C", "X5") since it's obvious to a human
// reader. This is the biggest driver of "Unknown" — fall back to this map
// when no brand alias is found directly in the title. Checked with word
// boundaries to avoid partial matches (e.g. "208" inside a phone number).
const MODEL_TO_BRAND: Record<string, string> = {
  golf: "Volkswagen", polo: "Volkswagen", passat: "Volkswagen", tiguan: "Volkswagen",
  touareg: "Volkswagen", touran: "Volkswagen", caddy: "Volkswagen", arteon: "Volkswagen",
  "t-cross": "Volkswagen", "t-roc": "Volkswagen", taigo: "Volkswagen",
  clio: "Renault", megane: "Renault", symbol: "Renault", kangoo: "Renault", twingo: "Renault",
  captur: "Renault", koleos: "Renault", talisman: "Renault", scenic: "Renault", laguna: "Renault",
  trafic: "Renault", master: "Renault",
  duster: "Dacia", logan: "Dacia", sandero: "Dacia", stepway: "Dacia", dokker: "Dacia", lodgy: "Dacia",
  "208": "Peugeot", "308": "Peugeot", "3008": "Peugeot", "5008": "Peugeot", "206": "Peugeot",
  "207": "Peugeot", "301": "Peugeot", "2008": "Peugeot", partner: "Peugeot", expert: "Peugeot", boxer: "Peugeot",
  corolla: "Toyota", yaris: "Toyota", rav4: "Toyota", hilux: "Toyota", avensis: "Toyota",
  "land cruiser": "Toyota", prado: "Toyota", camry: "Toyota", auris: "Toyota", innova: "Toyota",
  elantra: "Hyundai", tucson: "Hyundai", accent: "Hyundai", i10: "Hyundai", i20: "Hyundai",
  i30: "Hyundai", i40: "Hyundai", kona: "Hyundai", veloster: "Hyundai", "santa fe": "Hyundai", santa: "Hyundai",
  sportage: "Kia", picanto: "Kia", rio: "Kia", cerato: "Kia", sorento: "Kia", niro: "Kia",
  stonic: "Kia", soul: "Kia", carens: "Kia", ceed: "Kia",
  ibiza: "Seat", leon: "Seat",
  octavia: "Skoda", fabia: "Skoda", superb: "Skoda",
  uno: "Fiat", punto: "Fiat", panda: "Fiat", tipo: "Fiat", "500": "Fiat", doblo: "Fiat",
  swift: "Suzuki", vitara: "Suzuki", jimny: "Suzuki", alto: "Suzuki",
  qashqai: "Nissan", juke: "Nissan", micra: "Nissan",
  fiesta: "Ford", focus: "Ford", kuga: "Ford",
  astra: "Opel", corsa: "Opel", mokka: "Opel",
  // Audi alphanumeric codes
  a3: "Audi", a4: "Audi", a5: "Audi", a6: "Audi", a7: "Audi", a8: "Audi",
  q2: "Audi", q3: "Audi", q5: "Audi", q7: "Audi", q8: "Audi", tt: "Audi",
  // BMW alphanumeric codes
  x1: "BMW", x2: "BMW", x3: "BMW", x4: "BMW", x5: "BMW", x6: "BMW",
  "serie 1": "BMW", "serie 2": "BMW", "serie 3": "BMW", "serie 4": "BMW", "serie 5": "BMW", "serie 7": "BMW",
  // Mercedes-Benz codes
  "classe a": "Mercedes-Benz", "classe b": "Mercedes-Benz", "classe c": "Mercedes-Benz",
  "classe e": "Mercedes-Benz", "classe g": "Mercedes-Benz", "classe s": "Mercedes-Benz",
  cla: "Mercedes-Benz", glc: "Mercedes-Benz", gla: "Mercedes-Benz", glb: "Mercedes-Benz",
  gle: "Mercedes-Benz", gls: "Mercedes-Benz", vito: "Mercedes-Benz", sprinter: "Mercedes-Benz",
  // Citroën
  picasso: "Citroen", berlingo: "Citroen", jumpy: "Citroen", jumper: "Citroen",
  // Chinese brands increasingly present in Tunisia
  tiggo: "Chery", h6: "Haval", jolion: "Haval",
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function wordBoundaryMatch(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

function detectBrand(title: string): { brand: string; rest: string } {
  for (const alias of SORTED_ALIASES) {
    if (wordBoundaryMatch(title, alias)) {
      return { brand: BRAND_ALIASES[alias], rest: title };
    }
  }

  for (const [model, brand] of Object.entries(MODEL_TO_BRAND)) {
    if (wordBoundaryMatch(title, model)) {
      return { brand, rest: title };
    }
  }

  return { brand: "Unknown", rest: title };
}

// Both sites lazy-load real images only once a card scrolls into view
// (tayara.tn's <img> has loading="lazy" explicitly). Reading src right
// after page load only gets real URLs for cards already above the fold —
// this scrolls through the full page first so every card's image has a
// chance to load before we extract.
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
  await page.waitForTimeout(1000); // let the last batch of images finish loading
}

/**
 * Parses one card's inner text into the normalized shape. Confirmed layout:
 *   [price line "12345DT"]   <- optional, some listings have no price
 *   title (free text, one line)
 *   "Voitures"                <- category, always present
 *   "{location}, {relative time}"  <- always last line
 */
function parseCard(href: string, text: string): ScrapedListing | null {
  const match = href.match(ITEM_LINK_PATTERN);
  if (!match) return null;
  const id = match[1];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return null; // not enough structure to trust this card

  let idx = 0;
  let price = 0;
  if (/^\d[\d\s]*DT$/.test(lines[0])) {
    price = Number(lines[0].replace(/[^\d]/g, ""));
    idx = 1;
  }
  if (!price || price < 500 || price > 3_000_000) return null; // sanity bounds — reject garbage or 0-priced listings

  const locationLine = lines[lines.length - 1]; // "Tunis, an hour ago"
  const location = locationLine.split(",")[0]?.trim();
  const title = lines.slice(idx, lines.length - 2).join(" ").trim();
  if (!title) return null;

  const { brand, rest } = detectBrand(title);

  return {
    source: "TAYARA",
    sourceId: id,
    url: `${BASE_URL}${href}`,
    brandRaw: brand,
    modelRaw: rest,
    price,
    location,
    currency: "TND",
  };
}

/**
 * Scrapes one governorate's listing pages. Stops early if a page returns no
 * NEW listing ids (protects against re-scraping the same page forever if
 * pagination turns out not to work the way we expect).
 */
async function scrapeGovernorate(
  page: import("playwright").Page,
  governorateSlug: string,
  maxPages: number,
  seenSourceIds: string[]
): Promise<{ found: number; upserted: number }> {
  let found = 0;
  let upserted = 0;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url =
      pageNum === 1
        ? `${BASE_URL}${LISTING_PATH}/${governorateSlug}/`
        : `${BASE_URL}${LISTING_PATH}/${governorateSlug}/?page=${pageNum}`;

    let loaded = false;
    for (let attempt = 1; attempt <= 2 && !loaded; attempt++) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("a[href*='/item/voitures/']", { timeout: 20000, state: "attached" });
        loaded = true;
      } catch (err) {
        if (attempt === 2) {
          console.warn(`  ${governorateSlug} page ${pageNum}: failed after retry — ${err}`);
        } else {
          console.warn(`  ${governorateSlug} page ${pageNum}: attempt 1 failed, retrying — ${err}`);
          await sleep(2000);
        }
      }
    }
    if (!loaded) break; // both attempts failed — genuinely no more pages, or site is down

    // Scroll through the full page so every card's lazy-loaded image has a
    // chance to load, not just the ones above the fold.
    await autoScroll(page);

    const rawCards = await page.$$eval("a[href*='/item/voitures/']", (anchors) =>
      anchors.map((a) => {
        const img = a.querySelector("img");
        const imageURL = img?.getAttribute("src") || undefined;
        return {
          href: a.getAttribute("href") ?? "",
          text: (a as HTMLElement).innerText ?? "",
          imageURL,
        };
      })
    );

    const pageListings = rawCards
      .map(({ href, text, imageURL }) => {
        const listing = parseCard(href, text);
        if (listing && imageURL) listing.imageURL = imageURL;
        return listing;
      })
      .filter((x): x is ScrapedListing => x !== null);

    const newOnes = pageListings.filter((item) => !seenSourceIds.includes(item.sourceId));
    if (newOnes.length === 0) break; // no new listings — real end of results

    for (const item of newOnes) {
      try {
        seenSourceIds.push(item.sourceId);
        await upsertScrapedListing(item);
        found++;
        upserted++;
      } catch (err) {
        console.warn(`  skipped ${item.sourceId} (${item.brandRaw} ${item.modelRaw}, ${item.price} DT): ${err}`);
      }
    }

    await sleep(DELAY_MS);
  }

  return { found, upserted };
}

export async function scrapeTayara(maxPagesPerGovernorate = 3, governorates: string[] = GOVERNORATES) {
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
    for (const gov of governorates) {
      const result = await scrapeGovernorate(page, gov, maxPagesPerGovernorate, seenSourceIds);
      itemsFound += result.found;
      itemsUpserted += result.upserted;
      console.log(`  ${gov}: +${result.upserted}`);
    }

    await markMissingAsInactive("TAYARA", seenSourceIds);
    console.log(`tayara.tn: found ${itemsFound}, upserted ${itemsUpserted}`);
    return { itemsFound, itemsUpserted };
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  // Tunis-only run confirmed working (73 upserted). Switching to full
  // nationwide coverage now — if any governorate slug is wrong, that
  // governorate is silently skipped (see scrapeGovernorate's try/catch)
  // rather than crashing the whole run.
  scrapeTayara(3, GOVERNORATES).catch((err) => {
    console.error("tayara.tn scrape failed:", err);
    process.exit(1);
  });
}