<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ListingsController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\ReportsController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

Route::get('/listings', [ListingsController::class, 'index'])->name('listings.index');
Route::post('/listings/scrape/automobile-tn', [ListingsController::class, 'scrapeAutomobile'])->name('listings.scrape.automobile');
Route::post('/listings/scrape/tayara', [ListingsController::class, 'scrapeTayara'])->name('listings.scrape.tayara');
Route::get('/listings/{id}', [ListingsController::class, 'show'])->name('listings.show');
Route::delete('/listings/{id}', [ListingsController::class, 'destroy'])->name('listings.destroy');

Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');
Route::get('/reports/{id}', [ReportsController::class, 'show'])->name('reports.show');
Route::post('/reports/generate', [ReportsController::class, 'generate'])->name('reports.generate');
Route::delete('/reports/{id}', [ReportsController::class, 'destroy'])->name('reports.destroy');

Route::get('/monitoring', [MonitoringController::class, 'index'])->name('monitoring.index');
Route::delete('/monitoring/price-changes/{id}', [MonitoringController::class, 'destroy'])->name('monitoring.destroy');
