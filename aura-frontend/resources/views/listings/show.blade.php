@extends('layouts.app')

@section('title', ($listing['brand']['name'] ?? $listing['brandRaw']) . ' — Aura Observatory')

@section('content')
    <a href="{{ route('listings.index') }}" class="back-link">&larr; Back to listings</a>

    <div class="grid-2" style="align-items: start;">
        <div>
            @if (!empty($listing['imageURL']))
                <img src="{{ $listing['imageURL'] }}" style="width:100%; border-radius: var(--radius); border: 1px solid var(--border);" alt="">
            @else
                <div class="listing-thumb-placeholder" style="height:300px; border-radius: var(--radius);">No image</div>
            @endif
        </div>
        <div>
            <div class="eyebrow">{{ $listing['source'] === 'AUTOMOBILE_TN' ? 'automobile.tn' : 'tayara.tn' }}</div>
            @php
                $fullTitle = $listing['model']['name'] ?? $listing['modelRaw'];
                $isLongTitle = strlen($fullTitle) > 60;
                $shortTitle = $isLongTitle ? rtrim(\Illuminate\Support\Str::limit($fullTitle, 60, '')) : $fullTitle;
            @endphp
            <h1 class="page-title" style="margin-bottom: 8px;">
                {{ $listing['brand']['name'] ?? $listing['brandRaw'] }}
                <span id="listing-title-text" data-short="{{ $shortTitle }}" data-full="{{ $fullTitle }}">{{ $shortTitle }}</span>
                @if ($isLongTitle)
                    <button type="button" class="text-toggle" data-target="listing-title-text">(read more)</button>
                @endif
            </h1>
            <div class="listing-price" style="font-size: 24px; margin-bottom: 20px;">{{ number_format((float) $listing['currentPrice']) }} {{ $listing['currency'] }}</div>

            <table class="dtable" style="margin-bottom: 20px;">
                <tr><th>Year</th><td class="mono">{{ $listing['year'] ?? '—' }}</td></tr>
                <tr><th>Mileage</th><td class="mono">{{ $listing['mileageKm'] ? number_format($listing['mileageKm']).' km' : '—' }}</td></tr>
                <tr><th>Fuel</th><td>{{ $listing['fuelType'] }}</td></tr>
                <tr><th>Transmission</th><td>{{ $listing['transmission'] }}</td></tr>
                <tr><th>Location</th><td>{{ $listing['location'] ?? '—' }}</td></tr>
            </table>

            <div style="display:flex; gap:10px;">
                <a href="{{ $listing['url'] }}" target="_blank" class="btn btn-primary">View original listing &rarr;</a>
                <form method="POST" action="{{ route('listings.destroy', $listing['id']) }}" class="confirm-delete">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger">Delete</button>
                </form>
            </div>
        </div>
    </div>

    @if (!empty($listing['priceHistory']) && count($listing['priceHistory']) > 1)
        <div class="panel" style="margin-top: 20px;">
            <div class="panel-header">Price History</div>
            <table class="dtable">
                <thead><tr><th>Date</th><th class="num">Price</th></tr></thead>
                <tbody>
                    @foreach ($listing['priceHistory'] as $entry)
                        <tr>
                            <td class="mono">{{ \Carbon\Carbon::parse($entry['recordedAt'])->format('Y-m-d H:i') }}</td>
                            <td class="num">{{ number_format((float) $entry['price']) }} {{ $listing['currency'] }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif
@endsection
