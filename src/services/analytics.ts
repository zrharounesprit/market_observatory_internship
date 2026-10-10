import { prisma } from "../db/client";

/**
 * Average price over time for a given brand/model, bucketed by day.
 * Powers the "price evolution" chart.
 */
export async function getPriceEvolution(params: { brandId?: string; modelId?: string; days?: number }) {
  const { brandId, modelId, days = 90 } = params;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await prisma.priceHistory.findMany({
    where: {
      recordedAt: { gte: since },
      listing: {
        ...(brandId ? { brandId } : {}),
        ...(modelId ? { modelId } : {}),
      },
    },
    select: { price: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  // Bucket by day and average
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const h of history) {
    const day = h.recordedAt.toISOString().slice(0, 10);
    const bucket = buckets.get(day) ?? { sum: 0, count: 0 };
    bucket.sum += Number(h.price);
    bucket.count += 1;
    buckets.set(day, bucket);
  }

  return Array.from(buckets.entries())
    .map(([date, { sum, count }]) => ({ date, avgPrice: Math.round(sum / count) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Compares average price, listing count, and average mileage across
 * dealerships/sources for a given brand+model — the "competitor comparison".
 */
export async function getCompetitorComparison(brandId: string, modelId?: string) {
  const listings = await prisma.listing.findMany({
    where: { brandId, modelId, isActive: true },
    select: {
      currentPrice: true,
      mileageKm: true,
      source: true,
      dealership: { select: { name: true } },
    },
  });

  const groups = new Map<string, { prices: number[]; mileages: number[] }>();
  for (const l of listings) {
    const key = l.dealership?.name ?? l.source;
    const g = groups.get(key) ?? { prices: [], mileages: [] };
    g.prices.push(Number(l.currentPrice));
    if (l.mileageKm) g.mileages.push(l.mileageKm);
    groups.set(key, g);
  }

  return Array.from(groups.entries()).map(([competitor, g]) => ({
    competitor,
    listingCount: g.prices.length,
    avgPrice: Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length),
    avgMileageKm: g.mileages.length
      ? Math.round(g.mileages.reduce((a, b) => a + b, 0) / g.mileages.length)
      : null,
  }));
}

/**
 * High-level market snapshot: top brands by listing count, overall average
 * price, and price spread. Feeds both the dashboard and the AI report.
 */
export async function getMarketOverview() {
  const listings = await prisma.listing.findMany({
    where: { isActive: true },
    select: { currentPrice: true, source: true, brand: { select: { name: true } } },
  });

  const byBrand = new Map<string, number[]>();
  const bySource = new Map<string, number>();
  for (const l of listings) {
    const name = l.brand?.name ?? "Unknown";
    const arr = byBrand.get(name) ?? [];
    arr.push(Number(l.currentPrice));
    byBrand.set(name, arr);

    bySource.set(l.source, (bySource.get(l.source) ?? 0) + 1);
  }

  const brandStats = Array.from(byBrand.entries())
    .map(([brand, prices]) => ({
      brand,
      listingCount: prices.length,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    }))
    .sort((a, b) => b.listingCount - a.listingCount);

  const sourceStats = Array.from(bySource.entries()).map(([source, count]) => ({ source, count }));

  const allPrices = listings.map((l) => Number(l.currentPrice));
  const overallAvg = allPrices.length
    ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
    : 0;

  return {
    totalActiveListings: listings.length,
    overallAvgPrice: overallAvg,
    topBrands: brandStats.slice(0, 10),
    bySource: sourceStats,
  };
}
