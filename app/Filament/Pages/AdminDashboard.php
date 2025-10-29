<?php

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;
use Illuminate\Support\Facades\Auth;
use App\Filament\Widgets\ResidentStatsWidget;
use App\Filament\Widgets\ActivityStatsWidget;
use App\Filament\Widgets\VitalTrendsChartWidget;
use App\Filament\Widgets\BranchChartWidget;

class AdminDashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';
    protected static ?string $title = 'Admin Dashboard';
    protected static ?string $navigationLabel = 'Dashboard';
    protected static ?int $navigationSort = -1000;
    protected static ?string $navigationGroup = 'Dashboard';

    public static function canAccess(): bool
    {
        $user = Auth::user();
        return Auth::check() && (
            $user->role === 'admin' || 
            $user->role === 'administrator' || 
            $user->hasRole('administrator') || 
            $user->hasRole('super_admin')
        );
    }

    public static function shouldRegisterNavigation(): bool
    {
        return false; // Hidden from navigation, accessed via Dashboard redirect
    }

    public function getWidgets(): array
    {
        return [
            ResidentStatsWidget::class,
            ActivityStatsWidget::class,
            VitalTrendsChartWidget::class,
            BranchChartWidget::class,
        ];
    }

    public function getColumns(): int
    {
        return 2;
    }
}