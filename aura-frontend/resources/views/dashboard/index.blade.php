@extends('layouts.app')

@section('title', 'Dashboard — Aura Observatory')

@section('content')
    <div class="eyebrow"><span class="pulse-dot"></span>Market Observatory</div>
    <h1 class="page-title">Dashboard</h1>

    <div class="grid-2" style="margin-bottom: 20px;">
        <div class="readout">
            <div class="readout-value" data-countup="{{ $overview['totalActiveListings'] ?? 0 }}">0</div>
            <div class="readout-label">Active Listings</div>
        </div>
        <div class="readout">
            <div class="readout-value gold" data-countup="{{ $overview['overallAvgPrice'] ?? 0 }}" data-suffix=" TND">0</div>
            <div class="readout-label">Average Price</div>
        </div>
    </div>

    <div class="panel">
        <div class="panel-header">Market Price Trend &middot; last 90 days</div>
        <div class="panel-body">
            @if (count($priceEvolution) > 1)
                <canvas id="priceTrendChart" height="90"></canvas>
            @else
                <div class="empty-note">Not enough price history yet &mdash; needs a few days of repeated scraping to show a trend.</div>
            @endif
        </div>
    </div>

    <div class="panel">
        <div class="panel-header">Top Brands by Listing Volume</div>
        <div class="panel-body">
            @if (!empty($overview['topBrands']))
                <canvas id="topBrandsChart" height="130"></canvas>
            @else
                <div class="empty-note">No data yet &mdash; run a scrape first.</div>
            @endif
        </div>
    </div>

    <div class="grid-2">
        <div class="panel">
            <div class="panel-header">Marketplace Split</div>
            <div class="panel-body" style="display:flex; align-items:center; justify-content:center; min-height:220px;">
                @if (!empty($overview['bySource']))
                    <canvas id="sourceSplitChart" height="200"></canvas>
                @else
                    <div class="empty-note">No data yet.</div>
                @endif
            </div>
        </div>

        <div class="panel">
            <div class="panel-header">
                Recent Price Changes
                <a href="{{ route('monitoring.index') }}" class="small-link">View all &rarr;</a>
            </div>
            @forelse ($recentChanges as $change)
                <div class="ticker-row">
                    <div>
                        <div class="ticker-name">{{ $change['brand'] }} {{ $change['model'] }}</div>
                    </div>
                    <div class="ticker-delta {{ $change['percentChange'] < 0 ? 'down' : 'up' }}">
                        <span class="from">{{ number_format($change['oldPrice']) }}</span>
                        <span class="pct">{{ $change['percentChange'] > 0 ? '+' : '' }}{{ $change['percentChange'] }}%</span>
                    </div>
                </div>
            @empty
                <div class="empty-note">No price changes yet &mdash; needs at least two scrape runs.</div>
            @endforelse
        </div>
    </div>
@endsection

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script>
(function () {
    const violet = '#6D2E9E';
    const violetLight = '#9B5FCB';
    const gold = '#E8952E';
    const gridColor = '#E6DEF2';
    const textMuted = '#756A8C';

    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = textMuted;

    @if (count($priceEvolution) > 1)
    new Chart(document.getElementById('priceTrendChart'), {
        type: 'line',
        data: {
            labels: @json(collect($priceEvolution)->pluck('date')),
            datasets: [{
                label: 'Avg price (TND)',
                data: @json(collect($priceEvolution)->pluck('avgPrice')),
                borderColor: violet,
                backgroundColor: 'rgba(109, 46, 158, 0.08)',
                pointBackgroundColor: violet,
                pointRadius: 2,
                pointHoverRadius: 5,
                tension: 0.35,
                fill: true,
            }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: gridColor }, ticks: { callback: (v) => v.toLocaleString() + ' TND' } },
            },
        },
    });
    @endif

    @if (!empty($overview['topBrands']))
    new Chart(document.getElementById('topBrandsChart'), {
        type: 'bar',
        data: {
            labels: @json(collect($overview['topBrands'])->pluck('brand')),
            datasets: [{
                label: 'Listings',
                data: @json(collect($overview['topBrands'])->pluck('listingCount')),
                backgroundColor: violetLight,
                borderRadius: 4,
                maxBarThickness: 24,
            }],
        },
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (ctx) => {
                            const avgPrices = @json(collect($overview['topBrands'])->pluck('avgPrice'));
                            return 'Avg price: ' + avgPrices[ctx.dataIndex].toLocaleString() + ' TND';
                        },
                    },
                },
            },
            scales: {
                x: { grid: { color: gridColor } },
                y: { grid: { display: false } },
            },
        },
    });
    @endif

    @if (!empty($overview['bySource']))
    new Chart(document.getElementById('sourceSplitChart'), {
        type: 'doughnut',
        data: {
            labels: @json(collect($overview['bySource'])->map(fn ($s) => $s['source'] === 'AUTOMOBILE_TN' ? 'automobile.tn' : 'tayara.tn')),
            datasets: [{
                data: @json(collect($overview['bySource'])->pluck('count')),
                backgroundColor: [violet, gold],
                borderWidth: 0,
            }],
        },
        options: {
            plugins: { legend: { position: 'bottom' } },
            cutout: '65%',
        },
    });
    @endif
})();
</script>
@endpush
