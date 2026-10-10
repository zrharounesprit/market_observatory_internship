import { prisma } from "../db/client";

export interface PriceChangeEvent {
  id: string; // PriceHistory row id — needed to delete a specific event
  listingId: string;
  brand: string;
  model: string;
  url: string;
  oldPrice: number;
  newPrice: number;
  percentChange: number;
  recordedAt: Date;
}

/**
 * Finds listings whose price changed within the last `days` days.
 * A negative percentChange beyond `promotionThreshold` is treated as a
 * likely promotion (see getPromotions).
 */
export async function getPriceChanges(days = 7): Promise<PriceChangeEvent[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const listings = await prisma.listing.findMany({
    where: { priceHistory: { some: { recordedAt: { gte: since } } } },
    include: {
      priceHistory: { orderBy: { recordedAt: "asc" } },
      brand: { select: { name: true } },
      model: { select: { name: true } },
    },
  });

  const events: PriceChangeEvent[] = [];

  for (const listing of listings) {
    const history = listing.priceHistory;
    if (history.length < 2) continue; // need at least two points to diff

    const recent = history.filter((h) => h.recordedAt >= since);
    for (let i = 0; i < recent.length; i++) {
      const idxInFull = history.findIndex((h) => h.id === recent[i].id);
      if (idxInFull <= 0) continue; // no prior point to compare against
      const prev = history[idxInFull - 1];
      const oldPrice = Number(prev.price);
      const newPrice = Number(recent[i].price);
      if (oldPrice === newPrice) continue;

      events.push({
        id: recent[i].id,
        listingId: listing.id,
        brand: listing.brand?.name ?? listing.brandRaw,
        model: listing.model?.name ?? listing.modelRaw,
        url: listing.url,
        oldPrice,
        newPrice,
        percentChange: Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10,
        recordedAt: recent[i].recordedAt,
      });
    }
  }

  return events.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
}

/**
 * Promotions = price drops of at least `thresholdPercent` (default 5%).
 */
export async function getPromotions(days = 14, thresholdPercent = 5) {
  const changes = await getPriceChanges(days);
  return changes.filter((c) => c.percentChange <= -thresholdPercent);
}

export async function deletePriceChange(id: string) {
  await prisma.priceHistory.delete({ where: { id } });
}
