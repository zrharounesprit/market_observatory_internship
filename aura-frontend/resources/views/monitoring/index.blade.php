@extends('layouts.app')

@section('title', 'Monitoring — Aura Observatory')

@section('content')
    <div class="eyebrow">Market Observatory</div>
    <h1 class="page-title">Monitoring</h1>

    <div class="grid-2">
        <div class="panel">
            <div class="panel-header">Price Changes &middot; last {{ $days }} days</div>
            @forelse ($priceChanges as $change)
                <div class="ticker-row">
                    <a href="{{ route('listings.show', $change['listingId']) }}" style="flex:1;">
                        <div class="ticker-name">{{ $change['brand'] }} {{ $change['model'] }}</div>
                        <div class="ticker-time">{{ \Carbon\Carbon::parse($change['recordedAt'])->diffForHumans() }}</div>
                    </a>
                    <div class="ticker-delta {{ $change['percentChange'] < 0 ? 'down' : 'up' }}">
                        <span class="from">{{ number_format($change['oldPrice']) }}</span>
                        <span class="pct">{{ $change['percentChange'] > 0 ? '+' : '' }}{{ $change['percentChange'] }}%</span>
                    </div>
                    <form method="POST" action="{{ route('monitoring.destroy', $change['id']) }}" class="confirm-delete">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn btn-danger btn-sm">&times;</button>
                    </form>
                </div>
            @empty
                <div class="empty-note">No price changes in this window — needs at least two scrape runs spaced apart.</div>
            @endforelse
        </div>

        <div class="panel">
            <div class="panel-header">Promotions &middot; drops &ge;5%, last 14 days</div>
            @forelse ($promotions as $promo)
                <div class="ticker-row">
                    <a href="{{ route('listings.show', $promo['listingId']) }}" style="flex:1;">
                        <div class="ticker-name">{{ $promo['brand'] }} {{ $promo['model'] }}</div>
                    </a>
                    <div class="ticker-delta down">
                        <span class="from">{{ number_format($promo['oldPrice']) }}</span>
                        <span class="pct">{{ $promo['percentChange'] }}%</span>
                    </div>
                    <form method="POST" action="{{ route('monitoring.destroy', $promo['id']) }}" class="confirm-delete">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn btn-danger btn-sm">&times;</button>
                    </form>
                </div>
            @empty
                <div class="empty-note">No promotions detected in this window.</div>
            @endforelse
        </div>
    </div>
@endsection
