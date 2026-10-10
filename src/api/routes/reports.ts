import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/client";
import { generateMarketReport, generateCompetitorSuggestion } from "../../services/aiReports";

const router = Router();

// GET /api/reports - list past reports
router.get("/", async (_req, res) => {
  const reports = await prisma.marketReport.findMany({
    orderBy: { generatedAt: "desc" },
    take: 20,
  });
  res.json(reports);
});

// GET /api/reports/:id
router.get("/:id", async (req, res) => {
  const report = await prisma.marketReport.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

// POST /api/reports/generate  { periodDays?: number }
router.post("/generate", async (req, res) => {
  const schema = z.object({ periodDays: z.number().min(1).max(180).default(30) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const report = await generateMarketReport(parsed.data.periodDays);
    res.status(201).json(report);
  } catch (err) {
    console.error("Report generation failed:", err);
    res.status(502).json({ error: "AI report generation failed" });
  }
});

// POST /api/reports/suggestion  { brandId, modelId? }
router.post("/suggestion", async (req, res) => {
  const schema = z.object({ brandId: z.string(), modelId: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const suggestion = await generateCompetitorSuggestion(parsed.data.brandId, parsed.data.modelId);
    res.json({ suggestion });
  } catch (err) {
    console.error("Suggestion generation failed:", err);
    res.status(502).json({ error: "AI suggestion generation failed" });
  }
});

// DELETE /api/reports/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.marketReport.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ error: "Report not found" });
  }
});

export default router;
