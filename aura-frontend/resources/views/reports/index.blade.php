@extends('layouts.app')

@section('title', 'Reports — Aura Observatory')

@section('content')
    <div class="eyebrow">Market Observatory</div>
    <div style="display:flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px;">
        <h1 class="page-title" style="margin-bottom:0;">Reports</h1>
        <form method="POST" action="{{ route('reports.generate') }}">
            @csrf
            <input type="hidden" name="periodDays" value="30">
            <button type="submit" class="btn btn-primary">Generate New Report</button>
        </form>
    </div>
    <p class="helper-text">Covers the last 30 days &middot; generation calls Gemini and can take 10&ndash;20 seconds.</p>

    <div class="panel">
        @forelse ($reports as $report)
            <div class="ticker-row">
                <a href="{{ route('reports.show', $report['id']) }}" style="flex:1;">
                    <div class="ticker-name">{{ $report['title'] }}</div>
                    <div class="ticker-time">{{ \Carbon\Carbon::parse($report['generatedAt'])->format('Y-m-d H:i') }}</div>
                </a>
                <form method="POST" action="{{ route('reports.destroy', $report['id']) }}" class="confirm-delete">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                </form>
            </div>
        @empty
            <div class="empty-note">No reports generated yet.</div>
        @endforelse
    </div>
@endsection
