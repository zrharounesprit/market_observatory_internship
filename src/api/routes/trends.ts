import { Router } from "express";
import { z } from "zod";
import { getPriceEvolution, getCompetitorComparison, getMarketOverview } from "../../services/analytics";

const router = Router();

// GET /api/trends/price-evolution?brandId=&modelId=&days=
router.get("/price-evolution", async (req, res) => {
  const schema = z.object({
    brandId: z.string().optional(),
    modelId: z.string().optional(),
    days: z.coerce.number().min(1).max(365).default(90),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = await getPriceEvolution(parsed.data);
  res.json(data);
});

// GET /api/trends/competitors?brandId=&modelId=
router.get("/competitors", async (req, res) => {
  const schema = z.object({ brandId: z.string(), modelId: z.string().optional() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = await getCompetitorComparison(parsed.data.brandId, parsed.data.modelId);
  res.json(data);
});

// GET /api/trends/overview
router.get("/overview", async (_req, res) => {
  const data = await getMarketOverview();
  res.json(data);
});

export default router;
