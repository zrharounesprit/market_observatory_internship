import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/client";

const router = Router();

const querySchema = z.object({
  brandId: z.string().optional(),
  modelId: z.string().optional(),
  source: z.enum(["AUTOMOBILE_TN", "TAYARA", "DEALERSHIP"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

// GET /api/listings?brandId=&modelId=&source=&minPrice=&maxPrice=&page=&pageSize=
router.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { brandId, modelId, source, minPrice, maxPrice, isActive, page, pageSize } = parsed.data;

  const where = {
    ...(brandId ? { brandId } : {}),
    ...(modelId ? { modelId } : {}),
    ...(source ? { source } : {}),
    ...(isActive !== undefined ? { isActive } : { isActive: true }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          currentPrice: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: { brand: true, model: true, dealership: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.listing.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

// GET /api/listings/:id
router.get("/:id", async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      brand: true,
      model: true,
      dealership: true,
      priceHistory: { orderBy: { recordedAt: "asc" } },
    },
  });
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  res.json(listing);
});

// GET /api/listings/meta/brands - convenience endpoint for filter dropdowns
router.get("/meta/brands", async (_req, res) => {
  const brands = await prisma.brand.findMany({
    where: { listings: { some: {} } }, // hide orphaned rows (e.g. pre-canonicalization duplicates with 0 listings left)
    include: { models: true },
    orderBy: { name: "asc" },
  });
  res.json(brands);
});

// DELETE /api/listings/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.listing.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: "Listing not found" });
  }
});

export default router;
