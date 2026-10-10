<?php

namespace App\Http\Controllers;

use App\Services\AuraApiClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReportsController extends Controller
{
    public function __construct(protected AuraApiClient $api) {}

    public function index(): View
    {
        return view('reports.index', [
            'reports' => $this->api->getReports(),
        ]);
    }

    public function show(string $id): View
    {
        $report = $this->api->getReport($id);

        abort_if($report === null, 404);

        return view('reports.show', ['report' => $report]);
    }

    /**
     * Triggers Gemini generation on the Node side. This can take several
     * seconds — the view shows a loading state via a simple redirect,
     * not real-time streaming (that would need websockets/polling, not
     * worth the complexity for an internship deliverable).
     */
    public function generate(Request $request): RedirectResponse
    {
        $periodDays = (int) $request->input('periodDays', 30);

        $report = $this->api->generateReport($periodDays);

        if (!isset($report['id'])) {
            return redirect()->route('reports.index')
                ->with('error', 'Report generation failed — check the Node API is running and GEMINI_API_KEY is set.');
        }

        return redirect()->route('reports.show', $report['id']);
    }

    public function destroy(string $id): RedirectResponse
    {
        $this->api->deleteReport($id);

        return redirect()->route('reports.index')->with('status', 'Report deleted.');
    }
}
