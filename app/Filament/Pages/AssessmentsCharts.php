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
        $assessments = Assessment::all();
        
        $completionRanges = [
            '0-25%' => 0,
            '26-50%' => 0,
            '51-75%' => 0,
            '76-99%' => 0,
            '100%' => 0,
        ];

        foreach ($assessments as $assessment) {
            $completion = $assessment->completion_percentage;
            if ($completion <= 25) {
                $completionRanges['0-25%']++;
            } elseif ($completion <= 50) {
                $completionRanges['26-50%']++;
            } elseif ($completion <= 75) {
                $completionRanges['51-75%']++;
            } elseif ($completion < 100) {
                $completionRanges['76-99%']++;
            } else {
                $completionRanges['100%']++;
            }
        }

        return [
            'labels' => array_keys($completionRanges),
            'data' => array_values($completionRanges),
            'colors' => ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'],
        ];
    }

    public function getAssessmentTrends(): array
    {
        $last30Days = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $count = Assessment::whereDate('created_at', $date)->count();
            $last30Days[] = [
                'date' => $date->format('M j'),
                'count' => $count
            ];
        }

        return $last30Days;
    }
}
