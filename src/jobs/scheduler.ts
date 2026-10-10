import cron from "node-cron";
import { prisma } from "../db/client";
import { scrapeAutomobileTn } from "../scrapers/automobileTn";
import { scrapeTayara } from "../scrapers/tayara";

async function runScrapeJob(source: "AUTOMOBILE_TN" | "TAYARA", fn: () => Promise<{ itemsFound: number; itemsUpserted: number }>) {
  const log = await prisma.scrapeLog.create({ data: { source, status: "running" } });
  try {
    const result = await fn();
    await prisma.scrapeLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        itemsFound: result.itemsFound,
        itemsUpserted: result.itemsUpserted,
      },
    });
  } catch (err) {
    await prisma.scrapeLog.update({
      where: { id: log.id },
      data: { status: "failed", finishedAt: new Date(), error: String(err) },
    });
    console.error(`Scrape job failed for ${source}:`, err);
  }
}

/**
 * Registers cron jobs. Call this once from server.ts on boot.
 * Runs daily at 3am and 3pm Tunis time — twice a day to catch same-day
 * price drops for the "monitoring promotions" requirement.
 */
export function startScheduler() {
  cron.schedule("0 3,15 * * *", async () => {
    console.log("Running scheduled scrape...");
    await runScrapeJob("AUTOMOBILE_TN", () => scrapeAutomobileTn());
    await runScrapeJob("TAYARA", () => scrapeTayara());
    console.log("Scheduled scrape complete.");
  });

  console.log("Scheduler started: scrapes run at 03:00 and 15:00 daily.");
}
