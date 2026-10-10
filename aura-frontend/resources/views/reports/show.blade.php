@extends('layouts.app')

@section('title', $report['title'] . ' — Aura Observatory')

@section('content')
    <a href="{{ route('reports.index') }}" class="back-link">&larr; Back to reports</a>

    <div class="panel">
        <div class="panel-header">
            <div>{{ $report['title'] }}</div>
            <span class="ticker-time">{{ \Carbon\Carbon::parse($report['generatedAt'])->format('Y-m-d H:i') }}</span>
        </div>
        <div class="panel-body">
            {{-- Requires: composer require league/commonmark
                 (Str::markdown() is a Laravel helper but needs this package
                 installed — it's not bundled by default). --}}
            <div class="markdown-body">{!! \Illuminate\Support\Str::markdown($report['content']) !!}</div>
        </div>
    </div>

    <form method="POST" action="{{ route('reports.destroy', $report['id']) }}" class="confirm-delete" style="margin-top:16px;">
        @csrf
        @method('DELETE')
        <button type="submit" class="btn btn-danger">Delete report</button>
    </form>
@endsection
