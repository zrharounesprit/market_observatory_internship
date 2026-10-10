<?php

namespace App\Http\Controllers;

use App\Services\AuraApiClient;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __construct(protected AuraApiClient $api) {}

    public function index(): View
    {
        $overview = $this->api->getOverview();
        $priceChanges = $this->api->getPriceChanges(days: 7);
        // No brandId/modelId filter -> covers every listing's price history,
        // i.e. the whole market's average price trend over the period.
        $priceEvolution = $this->api->getPriceEvolution(['days' => 90]);

        return view('dashboard.index', [
            'overview' => $overview,
            'recentChanges' => array_slice($priceChanges, 0, 5),
            'priceEvolution' => $priceEvolution,
        ]);
    }
}
