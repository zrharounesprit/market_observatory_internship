import { prisma } from "../db/client";
import { ScrapedListing } from "../types";
import { canonicalizeBrand } from "../lib/brandCanonical";

// Very light normalization for now — trim/uppercase-first. Swap in a real
// alias table (e.g. "VW" -> "Volkswagen") once you see how messy the raw
// brand/model strings actually are across sources.
function normalize(str: string): string {
  return str.trim().replace(/\s+/g, " ");
}

async function findOrCreateBrand(brandRaw: string) {
  const name = normalize(brandRaw);
  return prisma.brand.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function findOrCreateModel(brandId: string, modelRaw: string) {
  const name = normalize(modelRaw);
  return prisma.model.upsert({
    where: { brandId_name: { brandId, name } },
    update: {},
    create: { brandId, name },
  });
}

async function findOrCreateDealership(name?: string) {
  if (!name) return undefined;
  const dealership = await prisma.dealership.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return dealership.id;
}

/**
 * Upserts a single scraped listing. If the listing already exists and the
 * price changed, appends a PriceHistory row instead of overwriting silently
 * — this is what powers price-evolution charts and promotion detection.
 */
export async function upsertScrapedListing(item: ScrapedListing) {
  const canonicalBrand = canonicalizeBrand(item.brandRaw);
  const brand = await findOrCreateBrand(canonicalBrand);
  const model = await findOrCreateModel(brand.id, item.modelRaw);
  const dealershipId = await findOrCreateDealership(item.dealershipName);

  const existing = await prisma.listing.findUnique({
    where: { source_sourceId: { source: item.source, sourceId: item.sourceId } },
  });

  const listing = await prisma.listing.upsert({
    where: { source_sourceId: { source: item.source, sourceId: item.sourceId } },
    update: {
      currentPrice: item.price,
      currency: item.currency ?? "TND",
      isActive: true,
      brandRaw: canonicalBrand,
      modelRaw: item.modelRaw,
      brandId: brand.id,
      modelId: model.id,
      dealershipId,
      year: item.year,
      mileageKm: item.mileageKm,
      fuelType: item.fuelType ?? "UNKNOWN",
      transmission: item.transmission ?? "UNKNOWN",
      location: item.location,
      imageURL: item.imageURL,
    },
    create: {
      source: item.source,
      sourceId: item.sourceId,
      url: item.url,
      brandRaw: canonicalBrand,
      modelRaw: item.modelRaw,
      brandId: brand.id,
      modelId: model.id,
      dealershipId,
      year: item.year,
      mileageKm: item.mileageKm,
      fuelType: item.fuelType ?? "UNKNOWN",
      transmission: item.transmission ?? "UNKNOWN",
      currentPrice: item.price,
      currency: item.currency ?? "TND",
      location: item.location,
      imageURL: item.imageURL,
    },
  });

  const priceChanged = !existing || Number(existing.currentPrice) !== item.price;
  if (priceChanged) {
    await prisma.priceHistory.create({
      data: { listingId: listing.id, price: item.price },
    });
  }

  return { listing, isNew: !existing, priceChanged };
}

/**
 * Marks listings from a source as inactive if they weren't seen in the
 * latest scrape run (i.e. delisted). Call this once per full scrape pass.
 */
export async function markMissingAsInactive(source: ScrapedListing["source"], seenSourceIds: string[]) {
  await prisma.listing.updateMany({
    where: { source, sourceId: { notIn: seenSourceIds }, isActive: true },
    data: { isActive: false },
  });
}
