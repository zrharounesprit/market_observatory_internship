import { Router } from "express";
import { scrapeAutomobileTn } from "../../scrapers/automobileTn";
import { scrapeTayara } from "../../scrapers/tayara";

const router = Router();

// Simple in-memory locks. Good enough for a single-process app — prevents
// a double-click (or the cron job firing mid-manual-run) from launching two
// overlapping browser sessions against the same source, which would waste
// resources and could produce confusing interleaved upsert logs.
let automobileRunning = false;
let tayaraRunning = false;

// POST /api/scrape/automobile-tn
// Runs synchronously and returns once finished — automobile.tn takes
// roughly 1-3 minutes depending on maxPages. The caller (Laravel) should
// use a generous HTTP timeout.
router.post("/automobile-tn", async (_req, res) => {
  if (automobileRunning) {
    return res.status(409).json({ error: "A scrape of automobile.tn is already running" });
  }

  automobileRunning = true;
  try {
    const result = await scrapeAutomobileTn();
    res.json({ source: "AUTOMOBILE_TN", ...result });
  } catch (err) {
    console.error("Manual automobile.tn scrape failed:", err);
    res.status(502).json({ error: "Scrape failed", detail: String(err) });
  } finally {
    automobileRunning = false;
  }
});

// POST /api/scrape/tayara
// Runs the full 23-governorate sweep — this is slow (often 5-15+ minutes).
// The caller should use a generous timeout and tell the user to expect a
// real wait, not just a spinner for a few seconds.
router.post("/tayara", async (_req, res) => {
  if (tayaraRunning) {
    return res.status(409).json({ error: "A scrape of tayara.tn is already running" });
  }

  tayaraRunning = true;
  try {
    const result = await scrapeTayara();
    res.json({ source: "TAYARA", ...result });
  } catch (err) {
    console.error("Manual tayara.tn scrape failed:", err);
    res.status(502).json({ error: "Scrape failed", detail: String(err) });
  } finally {
    tayaraRunning = false;
  }
});

// GET /api/scrape/status — lets the frontend check before triggering, so it
// can disable buttons instead of relying solely on the 409 response.
router.get("/status", (_req, res) => {
  res.json({ automobileRunning, tayaraRunning });
});

export default router;
