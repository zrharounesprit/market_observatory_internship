# Aura Observatory

Auto market observatory backend for Aura Dynamic. Scrapes automobile.tn and
tayara.tn, stores normalized listings + price history in PostgreSQL, and
exposes REST APIs for trends, AI-generated market reports, and price/promo
monitoring.

## Setup

```bash
npm install
npx playwright install chromium

cp .env.example .env
# fill in DATABASE_URL and ANTHROPIC_API_KEY

npx prisma migrate dev --name init
npm run dev
```

Server boots on `http://localhost:4000`. Health check: `GET /health`.

## Task -> module map

| Task                         | Where                                    |
|-------------------------------|-------------------------------------------|
| Scrape automobile.tn / tayara | `src/scrapers/automobileTn.ts`, `tayara.ts` |
| Collect brand/model/price/info| `prisma/schema.prisma` (`Listing` model)  |
| Price evolution               | `GET /api/trends/price-evolution`         |
| Competitor comparison         | `GET /api/trends/competitors`             |
| Market trends overview        | `GET /api/trends/overview`                |
| AI market reports              | `POST /api/reports/generate`             |
| AI suggestions                | `POST /api/reports/suggestion`            |
| Price change monitoring       | `GET /api/monitoring/price-changes`       |
| Promotion detection           | `GET /api/monitoring/promotions`          |

## Running scrapers manually (before wiring the cron schedule)

```bash
npm run scrape:automobile
npm run scrape:tayara
```

## What's stubbed vs. real

- **Real and working once DB is connected**: Prisma schema, upsert/price-history
  logic, all API routes, analytics math, AI report prompts, monitoring/promotion
  logic, cron scheduler.
- **Needs your input**: the CSS selectors inside `extractListingFromCard()` in
  both scraper files are placeholders (`.listing-card`, `.listing-title`, etc).
  Open the live site, inspect a real listing card, and swap in the actual
  selectors. Everything downstream (DB, API, AI reports) works off the
  normalized `ScrapedListing` shape, so fixing selectors is the only blocker
  between this skeleton and a fully working pipeline.

## Bot-detection notes

Both scrapers set a realistic user agent and a delay between page loads
(`SCRAPE_DELAY_MS`, default 1500ms). If you're still getting blocked:
- Try `SCRAPE_HEADLESS=false` locally to see what the site actually returns.
- Consider rotating between a couple of user agents.
- Add `await page.waitForTimeout(...)` with jitter instead of a fixed delay.
- As a last resort, a residential proxy service — but try the above first.
