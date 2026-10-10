@extends('layouts.app')

@section('title', 'Listings — Aura Observatory')

@section('content')
    <div class="eyebrow">Market Observatory</div>
    <h1 class="page-title">Listings <span class="mono" style="color: var(--text-muted); font-size: 16px;">({{ number_format($total) }})</span></h1>

    <div class="toolbar-row">
        <form method="GET" class="toolbar" style="margin-bottom:0;">
            <select name="brandId">
                <option value="">All brands</option>
                @foreach ($brands as $brand)
                    <option value="{{ $brand['id'] }}" @selected(($filters['brandId'] ?? null) === $brand['id'])>
                        {{ $brand['name'] }}
                    </option>
                @endforeach
            </select>
            <select name="source">
                <option value="">All sources</option>
                <option value="AUTOMOBILE_TN" @selected(($filters['source'] ?? null) === 'AUTOMOBILE_TN')>automobile.tn</option>
                <option value="TAYARA" @selected(($filters['source'] ?? null) === 'TAYARA')>tayara.tn</option>
            </select>
            <input type="number" name="minPrice" placeholder="Min TND" value="{{ $filters['minPrice'] ?? '' }}">
            <input type="number" name="maxPrice" placeholder="Max TND" value="{{ $filters['maxPrice'] ?? '' }}">
            <button type="submit" class="btn btn-primary">Filter</button>
            <a href="{{ route('listings.index') }}" class="btn btn-ghost">Reset</a>
        </form>

        <div class="scrape-actions">
            <form method="POST" action="{{ route('listings.scrape.automobile') }}" class="scrape-form" data-loading="Scraping automobile.tn&hellip; (1&ndash;3 min)">
                @csrf
                <button type="submit" class="btn btn-ghost btn-sm">&#8635; Scrape automobile.tn</button>
            </form>
            <form method="POST" action="{{ route('listings.scrape.tayara') }}" class="scrape-form" data-loading="Scraping tayara.tn&hellip; (5&ndash;15 min)">
                @csrf
                <button type="submit" class="btn btn-ghost btn-sm">&#8635; Scrape tayara.tn</button>
            </form>
        </div>
    </div>

    <div class="grid-cols">
        @forelse ($listings as $listing)
            <a href="{{ route('listings.show', $listing['id']) }}" class="listing-card">
                @if (!empty($listing['imageURL']))
                    <img src="{{ $listing['imageURL'] }}" class="listing-thumb" alt="">
                @else
                    <div class="listing-thumb-placeholder">No image</div>
                @endif
                <div class="listing-body">
                    @php
                        $cardFullTitle = trim(($listing['brand']['name'] ?? $listing['brandRaw']) . ' ' . ($listing['model']['name'] ?? $listing['modelRaw']));
                        $cardIsLong = strlen($cardFullTitle) > 70;
                        $cardShortTitle = $cardIsLong ? rtrim(\Illuminate\Support\Str::limit($cardFullTitle, 70, '')) : $cardFullTitle;
                        $titleId = 'card-title-' . $loop->index;
                    @endphp
                    <div class="listing-title">
                        <span id="{{ $titleId }}" data-short="{{ $cardShortTitle }}" data-full="{{ $cardFullTitle }}">{{ $cardShortTitle }}</span>
                        @if ($cardIsLong)
                            <button type="button" class="text-toggle" data-target="{{ $titleId }}">(read more)</button>
                        @endif
                    </div>
                    <div class="listing-price">{{ number_format((float) $listing['currentPrice']) }} TND</div>
                    <div class="listing-meta">
                        {{ $listing['year'] ?? '—' }} &middot; {{ $listing['mileageKm'] ? number_format($listing['mileageKm']).' km' : '—' }} &middot; {{ $listing['location'] ?? '—' }}
                    </div>
                    <span class="plate-badge">{{ $listing['source'] === 'AUTOMOBILE_TN' ? 'AUTOMOBILE.TN' : 'TAYARA.TN' }}</span>
                </div>
            </a>
        @empty
            <div class="empty-note">No listings match these filters.</div>
        @endforelse
    </div>

    <ul class="pagination">
        @if ($page > 1)
            <li><a href="{{ request()->fullUrlWithQuery(['page' => $page - 1]) }}" class="btn btn-ghost">&larr; Previous</a></li>
        @endif
        <li class="page-current">PAGE {{ $page }}</li>
        @if ($page * $pageSize < $total)
            <li><a href="{{ request()->fullUrlWithQuery(['page' => $page + 1]) }}" class="btn btn-ghost">Next &rarr;</a></li>
        @endif
    </ul>
@endsection
