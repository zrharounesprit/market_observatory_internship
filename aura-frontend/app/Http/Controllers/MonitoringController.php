<?php

namespace App\Http\Controllers;

use App\Services\AuraApiClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class MonitoringController extends Controller
{
    public function __construct(protected AuraApiClient $api) {}

    public function index(Request $request): View
    {
        $days = (int) $request->query('days', 7);

        return view('monitoring.index', [
            'priceChanges' => $this->api->getPriceChanges($days),
            'promotions' => $this->api->getPromotions(days: 14, threshold: 5),
            'days' => $days,
        ]);
    }

    public function destroy(string $id): RedirectResponse
    {
        $this->api->deletePriceChange($id);

        return redirect()->route('monitoring.index')->with('status', 'Record deleted.');
    }
}
