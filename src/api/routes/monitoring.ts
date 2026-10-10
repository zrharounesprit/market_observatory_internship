import { Router } from "express";
import { z } from "zod";
import { getPriceChanges, getPromotions, deletePriceChange } from "../../services/monitoring";

const router = Router();

// GET /api/monitoring/price-changes?days=
router.get("/price-changes", async (req, res) => {
  const schema = z.object({ days: z.coerce.number().min(1).max(90).default(7) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = await getPriceChanges(parsed.data.days);
  res.json(data);
});

// GET /api/monitoring/promotions?days=&threshold=
router.get("/promotions", async (req, res) => {
  const schema = z.object({
    days: z.coerce.number().min(1).max(90).default(14),
    threshold: z.coerce.number().min(1).max(90).default(5),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = await getPromotions(parsed.data.days, parsed.data.threshold);
  res.json(data);
});

// DELETE /api/monitoring/price-changes/:id
router.delete("/price-changes/:id", async (req, res) => {
  try {
    await deletePriceChange(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: "Price change record not found" });
  }
});

export default router;
