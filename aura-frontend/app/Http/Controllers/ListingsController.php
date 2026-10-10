<?php

namespace App\Http\Controllers;

use App\Services\AuraApiClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ListingsController extends Controller
{
    public function __construct(protected AuraApiClient $api) {}

    public function index(Request $request): View
    {
        $page = max(1, (int) $request->query('page', 1));

        $params = array_filter([
            'brandId' => $request->query('brandId'),
            'source' => $request->query('source'),
            'minPrice' => $request->query('minPrice'),
            'maxPrice' => $request->query('maxPrice'),
            'page' => $page,
            'pageSize' => 20,
        ], fn ($v) => $v !== null && $v !== '');

        $result = $this->api->getListings($params);
        $brands = $this->api->getBrands();

        return view('listings.index', [
            'listings' => $result['items'] ?? [],
            'total' => $result['total'] ?? 0,
            'page' => $result['page'] ?? 1,
            'pageSize' => $result['pageSize'] ?? 20,
            'brands' => $brands,
            'filters' => $request->only(['brandId', 'source', 'minPrice', 'maxPrice']),
        ]);
    }

    public function show(string $id): View
    {
        $listing = $this->api->getListing($id);

        abort_if($listing === null, 404);

        return view('listings.show', ['listing' => $listing]);
    }

    public function destroy(string $id): RedirectResponse
    {
        $this->api->deleteListing($id);

        return redirect()->route('listings.index')->with('status', 'Listing deleted.');
    }

    /**
     * PHP's default script timeout (~30s) would kill this request long
     * before a real scrape finishes, regardless of the HTTP client's own
     * timeout — set_time_limit(0) disables it for this request only.
     */
    public function scrapeAutomobile(): RedirectResponse
    {
        set_time_limit(0);
        $result = $this->api->runScrapeAutomobile();

        if (!$result['ok']) {
            return redirect()->route('listings.index')
                ->with('error', 'automobile.tn scrape failed — check the Node API is running.');
        }

        $data = $result['data'];
        return redirect()->route('listings.index')
            ->with('status', "automobile.tn: {$data['itemsUpserted']} listings updated.");
    }

    public function scrapeTayara(): RedirectResponse
    {
        set_time_limit(0);
        $result = $this->api->runScrapeTayara();

        if (!$result['ok']) {
            return redirect()->route('listings.index')
                ->with('error', 'tayara.tn scrape failed — check the Node API is running.');
        }

        $data = $result['data'];
        return redirect()->route('listings.index')
            ->with('status', "tayara.tn: {$data['itemsUpserted']} listings updated.");
    }
}
