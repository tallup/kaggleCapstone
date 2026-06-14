<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;
use App\Models\Resident;
use App\Models\VitalSign;
use App\Models\Assessment;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AdminHealthOverviewWidget extends Widget
{
    protected static string $view = 'filament.widgets.admin-health-overview';
    protected static ?string $heading = 'Resident Health Overview';
    protected static ?int $sort = 11;
    protected static ?string $pollingInterval = '60s';
    
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 1,
    ];
    
    public function getViewData(): array
    {
        $facilityId = app()->bound('facility') ? app('facility')?->id : 'global';
        return Cache::remember("admin.health.overview.{$facilityId}", 120, function () {
            $totalResidents = Resident::where('is_active', true)->count();
            
            // Residents with recent vitals (last 3 days)
            $recentVitals = Resident::whereHas('vitalSigns', function ($query) {
                $query->where('measurement_date', '>=', now()->subDays(3));
            })->where('is_active', true)->count();
            
            // Residents needing vitals
            $needingVitals = $totalResidents - $recentVitals;
            
            // Pending assessments
            $pendingAssessments = Assessment::whereNotIn('status', ['approved', 'archived'])
                ->where('is_active', true)
                ->count();
            
            // Critical vitals (abnormal readings in last 7 days)
            $criticalVitals = VitalSign::where('measurement_date', '>=', now()->subDays(7))
                ->where(function ($query) {
                    $query->where('systolic', '>', 180)
                        ->orWhere('systolic', '<', 90)
                        ->orWhere('diastolic', '>', 120)
                        ->orWhere('diastolic', '<', 60)
                        ->orWhere('temperature', '>', 100.4)
                        ->orWhere('temperature', '<', 96.8)
                        ->orWhere('pulse', '>', 100)
                        ->orWhere('pulse', '<', 50);
                })
                ->distinct('resident_id')
                ->count('resident_id');
            
            // Health status breakdown
            $healthStatus = [
                'excellent' => Resident::where('is_active', true)
                    ->whereDoesntHave('vitalSigns', function ($query) {
                        $query->where('measurement_date', '>=', now()->subDays(7))
                            ->where(function ($q) {
                                $q->where('systolic', '>', 140)
                                    ->orWhere('systolic', '<', 90)
                                    ->orWhere('temperature', '>', 99.5);
                            });
                    })
                    ->count(),
                'good' => Resident::where('is_active', true)
                    ->whereHas('vitalSigns', function ($query) {
                        $query->where('measurement_date', '>=', now()->subDays(7));
                    })
                    ->whereDoesntHave('vitalSigns', function ($query) {
                        $query->where('measurement_date', '>=', now()->subDays(7))
                            ->where(function ($q) {
                                $q->where('systolic', '>', 160)
                                    ->orWhere('systolic', '<', 90)
                                    ->orWhere('temperature', '>', 100);
                            });
                    })
                    ->count(),
                'needs_attention' => $criticalVitals,
            ];
            
            return [
                'total_residents' => $totalResidents,
                'recent_vitals' => $recentVitals,
                'needing_vitals' => $needingVitals,
                'pending_assessments' => $pendingAssessments,
                'critical_vitals' => $criticalVitals,
                'health_status' => $healthStatus,
            ];
        });
    }
}

