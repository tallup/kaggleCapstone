<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Models\SleepRecord;
use App\Models\SleepPattern;
use App\Models\Resident;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class SleepCharts extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-chart-bar';
    protected static string $view = 'filament.pages.sleep-charts';
    protected static ?string $title = 'Sleep Analytics';
    protected static ?string $navigationLabel = 'Sleep Charts';
    protected static ?string $navigationGroup = 'Reports';
    protected static ?int $navigationSort = 5;

    public static function canAccess(): bool
    {
        return Auth::check() && (Auth::user()->hasRole('administrator') || Auth::user()->hasRole('super_admin'));
    }

    public static function shouldRegisterNavigation(): bool
    {
        return Auth::check() && (Auth::user()->hasRole('administrator') || Auth::user()->hasRole('super_admin'));
    }

    public function getSleepStats(): array
    {
        $totalSleepRecords = SleepRecord::count();
        $totalSleepPatterns = SleepPattern::count();
        $thisWeekSleepRecords = SleepRecord::whereBetween('sleep_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])->count();
        $averageSleepHours = SleepRecord::avg('total_sleep_hours') ?? 0;

        return [
            'total_sleep_records' => $totalSleepRecords,
            'total_sleep_patterns' => $totalSleepPatterns,
            'this_week_sleep_records' => $thisWeekSleepRecords,
            'average_sleep_hours' => round($averageSleepHours, 1),
        ];
    }

    public function getSleepTrendsData(): array
    {
        $trends = SleepRecord::selectRaw('DATE(sleep_date) as date, AVG(total_sleep_hours) as avg_hours')
            ->where('sleep_date', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $labels = $trends->pluck('date')->map(fn($date) => Carbon::parse($date)->format('M d'))->toArray();
        $data = $trends->pluck('avg_hours')->map(fn($hours) => round($hours, 1))->toArray();

        return [
            'labels' => $labels,
            'datasets' => [
                [
                    'label' => 'Average Sleep Hours',
                    'data' => $data,
                    'borderColor' => '#8B5CF6', // purple-500
                    'backgroundColor' => 'rgba(139, 92, 246, 0.1)',
                    'tension' => 0.3,
                    'fill' => true,
                ],
            ],
        ];
    }

    public function getSleepQualityDistribution(): array
    {
        $qualityData = SleepRecord::selectRaw('sleep_quality, COUNT(*) as count')
            ->groupBy('sleep_quality')
            ->pluck('count', 'sleep_quality');

        $labels = $qualityData->keys()->toArray();
        $data = $qualityData->values()->toArray();
        $colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']; // Red, Orange, Green, Blue, Purple

        return [
            'labels' => $labels,
            'data' => $data,
            'colors' => $colors,
        ];
    }

    public function getSleepHoursDistribution(): array
    {
        $hoursData = SleepRecord::selectRaw('
            CASE 
                WHEN sleep_records.total_sleep_hours < 4 THEN "Less than 4 hours"
                WHEN sleep_records.total_sleep_hours BETWEEN 4 AND 6 THEN "4-6 hours"
                WHEN sleep_records.total_sleep_hours BETWEEN 6 AND 8 THEN "6-8 hours"
                WHEN sleep_records.total_sleep_hours BETWEEN 8 AND 10 THEN "8-10 hours"
                WHEN sleep_records.total_sleep_hours > 10 THEN "More than 10 hours"
                ELSE "Unknown"
            END as sleep_range,
            COUNT(*) as count
        ')
        ->groupByRaw('
            CASE 
                WHEN sleep_records.total_sleep_hours < 4 THEN "Less than 4 hours"
                WHEN sleep_records.total_sleep_hours BETWEEN 4 AND 6 THEN "4-6 hours"
                WHEN sleep_records.total_sleep_hours BETWEEN 6 AND 8 THEN "6-8 hours"
                WHEN sleep_records.total_sleep_hours BETWEEN 8 AND 10 THEN "8-10 hours"
                WHEN sleep_records.total_sleep_hours > 10 THEN "More than 10 hours"
                ELSE "Unknown"
            END
        ')
        ->pluck('count', 'sleep_range');

        $labels = $hoursData->keys()->toArray();
        $data = $hoursData->values()->toArray();
        $colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#6B7280'];

        return [
            'labels' => $labels,
            'data' => $data,
            'colors' => $colors,
        ];
    }

    public function getResidentSleepData(): array
    {
        $residentSleep = SleepRecord::selectRaw('residents.name as resident_name, AVG(sleep_records.total_sleep_hours) as avg_sleep_hours')
            ->join('residents', 'sleep_records.resident_id', '=', 'residents.id')
            ->groupBy('residents.name')
            ->orderByDesc('avg_sleep_hours')
            ->limit(5)
            ->get();

        $labels = $residentSleep->pluck('resident_name')->toArray();
        $data = $residentSleep->pluck('avg_sleep_hours')->map(fn($hours) => round($hours, 1))->toArray();
        $colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        return [
            'labels' => $labels,
            'data' => $data,
            'colors' => $colors,
        ];
    }
}
