# Aura Observatory

Automotive market observatory for the Tunisian used-car market (Aura Dynamic internship project). Tracks listings from **automobile.tn** and **tayara.tn**, stores price history, and surfaces trends, AI-generated market reports, and price/promotion monitoring.

The project is split into two repos:

| Repo | Stack | Role |
|---|---|---|
| `aura-observatory` | Node.js, TypeScript, Express, Prisma, PostgreSQL, Playwright | Scraping, data storage, analytics, AI reports, REST API |
| `aura-frontend` | Laravel (PHP), Blade | Dashboard, listings browser, reports, monitoring UI — calls the Node API over HTTP, no direct DB access |

## Architecture

```
automobile.tn ─┐
                ├─> Playwright scrapers ─> PostgreSQL (Prisma) ─> Express API ─> Laravel frontend
tayara.tn      ─┘                                │
                                                   └─> Gemini API (AI reports)
```

The frontend holds no scraping or business logic — it's a thin presentation layer over the backend's REST API, so it could be swapped or duplicated (mobile app, internal tool) without touching the backend.

## Backend (`aura-observatory`)

### Setup
```bash
npm install
npx playwright install chromium
cp .env.example .env   # fill in DATABASE_URL and GEMINI_API_KEY
npx prisma migrate dev
npm run dev
```
Runs on `http://localhost:4000`.

### Key scripts
```bash
npm run scrape:automobile   # manual scrape, automobile.tn
npm run scrape:tayara       # manual scrape, tayara.tn (all 23 governorates)
npm run merge-brands        # one-off: merge duplicate brand rows (casing/spelling variants)
```

### Data model (Prisma)
- **Listing** — one row per listing per source; current price, specs, status
- **PriceHistory** — appended only when a listing's price actually changes
- **Brand / Model** — normalized reference tables (canonicalized centrally, e.g. "Bmw"/"BMW" → one brand)
- **Dealership** — for competitor comparison
- **MarketReport** — stored AI-generated reports
- **ScrapeLog** — per-run scrape records

### API endpoints

**Listings**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/listings` | Filterable, paginated search (brand, source, price range) |
| GET | `/api/listings/:id` | Single listing + full price history |
| GET | `/api/listings/meta/brands` | Brand/model list for filters |
| DELETE | `/api/listings/:id` | Remove a listing (cascades price history) |

**Trends**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/trends/overview` | Active count, avg price, top brands, source split |
| GET | `/api/trends/price-evolution` | Avg price over time (optionally filtered by brand/model) |
| GET | `/api/trends/competitors` | Price/mileage comparison across dealerships for a model |

**Reports (AI)**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/reports` | List generated reports |
| GET | `/api/reports/:id` | Single report content |
| POST | `/api/reports/generate` | Generate a new report via Gemini |
| POST | `/api/reports/suggestion` | Pricing suggestions for a brand/model |
| DELETE | `/api/reports/:id` | Remove a report |

**Monitoring**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/monitoring/price-changes` | Price changes in the last N days |
| GET | `/api/monitoring/promotions` | Price drops ≥5% |
| DELETE | `/api/monitoring/price-changes/:id` | Remove a price-change record |

**Scraping (manual trigger)**
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/scrape/automobile-tn` | Run automobile.tn scrape synchronously (~1–3 min) |
| POST | `/api/scrape/tayara` | Run full tayara.tn scrape synchronously (~5–15 min) |
| GET | `/api/scrape/status` | Whether a scrape is currently running |

## Frontend (`aura-frontend`)

### Setup
```bash
composer install
cp .env.example .env   # set AURA_API_BASE_URL=http://localhost:4000
php artisan serve
```

### Pages
- **Dashboard** — stat readouts, price-trend chart, top-brands chart, source-split chart, recent price changes
- **Listings** — filterable grid, per-source scrape buttons, delete
- **Listing detail** — full specs, price history, delete
- **Reports** — list + generate (Gemini) + view
- **Monitoring** — price changes and promotions

## Known limitations
- Brand/model recognition on tayara.tn (free-text titles) covers ~80–85% of listings; the rest fall to "Unknown"
- Image URLs depend on each site's lazy-loading behavior and may occasionally be missing
- Manual scrape triggers block the HTTP request until finished — no background job queue yet