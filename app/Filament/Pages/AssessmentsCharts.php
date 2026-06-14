<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Models\Assessment;
use App\Models\Resident;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AssessmentsCharts extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-chart-bar';
    protected static string $view = 'filament.pages.assessments-charts';
    protected static ?string $title = 'Assessment Analytics';
    protected static ?string $navigationLabel = 'Assessment Charts';
    protected static ?string $navigationGroup = 'Reports';
    protected static ?int $navigationSort = 3;

    public static function canAccess(): bool
    {
        return Auth::check() && (Auth::user()->hasRole('administrator') || Auth::user()->hasRole('super_admin'));
    }

    public static function shouldRegisterNavigation(): bool
    {
        return Auth::check() && (Auth::user()->hasRole('administrator') || Auth::user()->hasRole('super_admin'));
    }

    public function getAssessmentStats(): array
    {
        $totalAssessments = Assessment::count();
        $completedAssessments = Assessment::where('status', 'approved')->count();
        $pendingAssessments = Assessment::whereNotIn('status', ['approved', 'archived'])->count();
        $thisMonthAssessments = Assessment::whereMonth('created_at', Carbon::now()->month)->count();

        return [
            'total_assessments' => $totalAssessments,
            'completed_assessments' => $completedAssessments,
            'pending_assessments' => $pendingAssessments,
            'this_month_assessments' => $thisMonthAssessments,
        ];
    }

    public function getCompletionData(): array
    {
        $counts = Assessment::selectRaw("
            sum(case when completion_percentage <= 25 then 1 else 0 end) as range_0_25,
            sum(case when completion_percentage > 25 and completion_percentage <= 50 then 1 else 0 end) as range_26_50,
            sum(case when completion_percentage > 50 and completion_percentage <= 75 then 1 else 0 end) as range_51_75,
            sum(case when completion_percentage > 75 and completion_percentage < 100 then 1 else 0 end) as range_76_99,
            sum(case when completion_percentage = 100 then 1 else 0 end) as range_100
        ")->first();

        return [
            'labels' => ['0-25%', '26-50%', '51-75%', '76-99%', '100%'],
            'data' => [
                (int) $counts->range_0_25,
                (int) $counts->range_26_50,
                (int) $counts->range_51_75,
                (int) $counts->range_76_99,
                (int) $counts->range_100,
            ],
            'colors' => ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'],
        ];
    }

    public function getAssessmentTrends(): array
    {
        // Single query instead of 30 separate count queries
        $startDate = Carbon::now()->subDays(29)->startOfDay();
        $dailyCounts = Assessment::where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, count(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $last30Days = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $last30Days[] = [
                'date' => $date->format('M j'),
                'count' => (int) ($dailyCounts[$date->toDateString()] ?? 0),
            ];
        }

        return $last30Days;
    }
}
