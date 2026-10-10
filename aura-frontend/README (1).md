<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ListingsController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\ReportsController;
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

Route::get('/listings', [ListingsController::class, 'index'])->name('listings.index');
Route::get('/listings/{id}', [ListingsController::class, 'show'])->name('listings.show');

Route::get('/reports', [ReportsController::class, 'index'])->name('reports.index');
Route::get('/reports/{id}', [ReportsController::class, 'show'])->name('reports.show');
Route::post('/reports/generate', [ReportsController::class, 'generate'])->name('reports.generate');

Route::get('/monitoring', [MonitoringController::class, 'index'])->name('monitoring.index');
