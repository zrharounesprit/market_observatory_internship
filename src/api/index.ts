import { Router } from "express";
import listings from "./routes/listings";
import trends from "./routes/trends";
import reports from "./routes/reports";
import monitoring from "./routes/monitoring";
import scrape from "./routes/scrape";

const router = Router();

router.use("/listings", listings);
router.use("/trends", trends);
router.use("/reports", reports);
router.use("/monitoring", monitoring);
router.use("/scrape", scrape);

export default router;
