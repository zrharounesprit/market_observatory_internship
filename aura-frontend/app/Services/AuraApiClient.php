<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Thin wrapper around the Node/Express Aura Observatory API.
 * Every method returns the decoded JSON as an array — Blade views handle
 * formatting (prices, dates, etc.) since Prisma serializes Decimal fields
 * as strings, not numbers.
 */
class AuraApiClient
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.aura_api.base_url'), '/');
    }

    public function getOverview(): array
    {
        return Http::get("{$this->baseUrl}/api/trends/overview")->json() ?? [];
    }

    public function getListings(array $params = []): array
    {
        return Http::get("{$this->baseUrl}/api/listings", $params)->json() ?? [];
    }

    public function getListing(string $id): ?array
    {
        $response = Http::get("{$this->baseUrl}/api/listings/{$id}");
        return $response->successful() ? $response->json() : null;
    }

    public function getBrands(): array
    {
        return Http::get("{$this->baseUrl}/api/listings/meta/brands")->json() ?? [];
    }

    public function getPriceEvolution(array $params = []): array
    {
        return Http::get("{$this->baseUrl}/api/trends/price-evolution", $params)->json() ?? [];
    }

    public function getCompetitors(string $brandId, ?string $modelId = null): array
    {
        return Http::get("{$this->baseUrl}/api/trends/competitors", array_filter([
            'brandId' => $brandId,
            'modelId' => $modelId,
        ]))->json() ?? [];
    }

    public function getReports(): array
    {
        return Http::get("{$this->baseUrl}/api/reports")->json() ?? [];
    }

    public function getReport(string $id): ?array
    {
        $response = Http::get("{$this->baseUrl}/api/reports/{$id}");
        return $response->successful() ? $response->json() : null;
    }

    /**
     * Report generation calls Gemini server-side on the Node app and can
     * take several seconds — bump the timeout so Laravel doesn't give up
     * early on a request that's actually still working.
     */
    public function generateReport(int $periodDays = 30): array
    {
        return Http::timeout(60)
            ->post("{$this->baseUrl}/api/reports/generate", ['periodDays' => $periodDays])
            ->json() ?? [];
    }

    public function getPriceChanges(int $days = 7): array
    {
        return Http::get("{$this->baseUrl}/api/monitoring/price-changes", ['days' => $days])->json() ?? [];
    }

    public function getPromotions(int $days = 14, int $threshold = 5): array
    {
        return Http::get("{$this->baseUrl}/api/monitoring/promotions", [
            'days' => $days,
            'threshold' => $threshold,
        ])->json() ?? [];
    }

    public function deleteListing(string $id): bool
    {
        return Http::delete("{$this->baseUrl}/api/listings/{$id}")->successful();
    }

    public function deleteReport(string $id): bool
    {
        return Http::delete("{$this->baseUrl}/api/reports/{$id}")->successful();
    }

    public function deletePriceChange(string $id): bool
    {
        return Http::delete("{$this->baseUrl}/api/monitoring/price-changes/{$id}")->successful();
    }

    /**
     * Triggers a full automobile.tn scrape and waits for it to finish.
     * Usually 1-3 minutes — timeout set generously so Laravel doesn't give
     * up on a request that's genuinely still working.
     */
    public function runScrapeAutomobile(): array
    {
        $response = Http::timeout(600)->post("{$this->baseUrl}/api/scrape/automobile-tn");
        return [
            'ok' => $response->successful(),
            'status' => $response->status(),
            'data' => $response->json() ?? [],
        ];
    }

    /**
     * Triggers a full tayara.tn scrape across all governorates and waits
     * for it to finish. Genuinely slow — often 5-15+ minutes. Timeout set
     * high enough to cover a real worst-case run.
     */
    public function runScrapeTayara(): array
    {
        $response = Http::timeout(1200)->post("{$this->baseUrl}/api/scrape/tayara");
        return [
            'ok' => $response->successful(),
            'status' => $response->status(),
            'data' => $response->json() ?? [],
        ];
    }
}
