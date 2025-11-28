<?php

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;
use Illuminate\Support\Facades\Auth;
use App\Filament\Widgets\HeroSectionWidget;
use App\Filament\Widgets\StatsOverviewWidget;
use App\Filament\Widgets\QuickActionsWidget;
use App\Filament\Widgets\AdminUpcomingAppointmentsWidget;
use App\Filament\Widgets\AdminResidentsWidget;
use App\Filament\Widgets\AdminMedicationRemindersWidget;
use App\Filament\Widgets\ResidentStatsWidget;
use App\Filament\Widgets\ActivityStatsWidget;
use App\Filament\Widgets\AdminTrendsChartWidget;
use App\Filament\Widgets\AdminHealthOverviewWidget;
use App\Filament\Widgets\AdminSystemHealthWidget;

class AdminDashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';
    protected static ?string $title = 'Admin Dashboard';
    protected static ?string $navigationLabel = 'Dashboard';
    protected static ?int $navigationSort = -1000;
    protected static ?string $navigationGroup = 'Dashboard';
    protected static string $routePath = 'admin-dashboard';

    public static function canAccess(): bool
    {
        $user = Auth::user();
        // Super admins should not access this - they have their own dashboard
        return Auth::check() && 
            $user->role !== 'super_admin' && 
            !$user->hasRole('super_admin') && (
            $user->role === 'admin' || 
            $user->role === 'administrator' || 
            $user->hasRole('administrator')
        );
    }

    public static function shouldRegisterNavigation(): bool
    {
        return false; // Hidden from navigation, accessed via Dashboard redirect
    }

    public function getWidgets(): array
    {
        return [
            HeroSectionWidget::class,
            StatsOverviewWidget::class,
            QuickActionsWidget::class,
            AdminTrendsChartWidget::class,
            AdminHealthOverviewWidget::class,
            AdminSystemHealthWidget::class,
            ResidentStatsWidget::class,
            ActivityStatsWidget::class,
            AdminUpcomingAppointmentsWidget::class,
            AdminResidentsWidget::class,
            AdminMedicationRemindersWidget::class,
        ];
    }

    public function getColumns(): int | array
    {
        return [
            'sm' => 1,
            'md' => 2,
            'lg' => 3,
            'xl' => 4,
        ];
    }
}