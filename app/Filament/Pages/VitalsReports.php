<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Models\VitalSign;
use App\Models\Resident;
use App\Models\User;
use App\Services\PremiumReportService;
use App\Support\ReportBranding;
use App\Models\Facility;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class VitalsReports extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-heart';
    protected static string $view = 'filament.pages.vitals-reports';
    protected static ?string $title = 'Vitals Reports';
    protected static ?string $navigationLabel = 'Vitals Reports';
    protected static ?string $navigationGroup = 'Reports';
    protected static ?int $navigationSort = 2;

    public static function canAccess(): bool
    {
        return Auth::check() && (Auth::user()->hasRole('administrator') || Auth::user()->hasRole('super_admin'));
    }

    public function mount(): void
    {
        if (request()->has('export')) {
            $response = $this->exportVitalsReport(app(PremiumReportService::class));
            if ($response) {
                $response->send();
                exit;
            }
        }
    }

    public function getVitalsStats(): array
    {
        $totalVitals = VitalSign::count();
        $todayVitals = VitalSign::whereDate('measurement_date', Carbon::today())->count();
        $thisWeekVitals = VitalSign::whereBetween('measurement_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])->count();
        $avgSystolic = VitalSign::avg('systolic') ?? 0;
        $avgDiastolic = VitalSign::avg('diastolic') ?? 0;
        $avgPulse = VitalSign::avg('pulse') ?? 0;
        $avgTemperature = VitalSign::avg('temperature') ?? 0;

        return [
            'total_vitals' => $totalVitals,
            'today_vitals' => $todayVitals,
            'this_week_vitals' => $thisWeekVitals,
            'avg_systolic' => round($avgSystolic, 1),
            'avg_diastolic' => round($avgDiastolic, 1),
            'avg_pulse' => round($avgPulse, 1),
            'avg_temperature' => round($avgTemperature, 1),
        ];
    }

    public function getVitalsTrendsData(): array
    {
        $trends = VitalSign::selectRaw('DATE(measurement_date) as date, COUNT(*) as count, AVG(systolic) as avg_systolic, AVG(diastolic) as avg_diastolic, AVG(pulse) as avg_pulse')
            ->where('measurement_date', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $labels = $trends->pluck('date')->map(fn($date) => Carbon::parse($date)->format('M d'))->toArray();
        $counts = $trends->pluck('count')->toArray();
        $systolic = $trends->pluck('avg_systolic')->map(fn($val) => round($val, 1))->toArray();
        $diastolic = $trends->pluck('avg_diastolic')->map(fn($val) => round($val, 1))->toArray();
        $pulse = $trends->pluck('avg_pulse')->map(fn($val) => round($val, 1))->toArray();

        return [
            'labels' => $labels,
            'counts' => $counts,
            'systolic' => $systolic,
            'diastolic' => $diastolic,
            'pulse' => $pulse,
        ];
    }

    public function getBloodPressureDistribution(): array
    {
        $bpData = VitalSign::selectRaw('
            CASE 
                WHEN systolic < 120 AND diastolic < 80 THEN "Normal"
                WHEN systolic BETWEEN 120 AND 129 AND diastolic < 80 THEN "Elevated"
                WHEN systolic BETWEEN 130 AND 139 OR diastolic BETWEEN 80 AND 89 THEN "Stage 1 Hypertension"
                WHEN systolic BETWEEN 140 AND 179 OR diastolic BETWEEN 90 AND 119 THEN "Stage 2 Hypertension"
                WHEN systolic >= 180 OR diastolic >= 120 THEN "Hypertensive Crisis"
                ELSE "Unknown"
            END as bp_category
        ')
        ->groupBy('bp_category')
        ->selectRaw('COUNT(*) as count')
        ->pluck('count', 'bp_category');

        $labels = $bpData->keys()->toArray();
        $data = $bpData->values()->toArray();
        $colors = ['#10B981', '#F59E0B', '#EF4444', '#DC2626', '#7C2D12', '#6B7280'];

        return [
            'labels' => $labels,
            'data' => $data,
            'colors' => $colors,
        ];
    }

    public function getTopResidentsByVitals(): array
    {
        $residents = VitalSign::selectRaw('residents.name as resident_name, COUNT(vital_signs.id) as vitals_count, AVG(vital_signs.systolic) as avg_systolic, AVG(vital_signs.diastolic) as avg_diastolic')
            ->join('residents', 'vital_signs.resident_id', '=', 'residents.id')
            ->groupBy('residents.name')
            ->orderByDesc('vitals_count')
            ->limit(10)
            ->get();

        return $residents->map(function($resident) {
            return [
                'name' => $resident->resident_name,
                'vitals_count' => $resident->vitals_count,
                'avg_systolic' => round($resident->avg_systolic, 1),
                'avg_diastolic' => round($resident->avg_diastolic, 1),
            ];
        })->toArray();
    }

    public function getVitalsByTimeOfDay(): array
    {
        // Use SQLite-compatible date functions
        $timeData = VitalSign::selectRaw('CAST(strftime("%H", created_at) AS INTEGER) as hour, COUNT(*) as count, AVG(systolic) as avg_systolic, AVG(pulse) as avg_pulse')
            ->where('measurement_date', '>=', Carbon::now()->subDays(30))
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        $labels = $timeData->pluck('hour')->map(fn($hour) => $hour . ':00')->toArray();
        $counts = $timeData->pluck('count')->toArray();
        $systolic = $timeData->pluck('avg_systolic')->map(fn($val) => round($val, 1))->toArray();
        $pulse = $timeData->pluck('avg_pulse')->map(fn($val) => round($val, 1))->toArray();

        return [
            'labels' => $labels,
            'counts' => $counts,
            'systolic' => $systolic,
            'pulse' => $pulse,
        ];
    }

    public function getStaffVitalsPerformance(): array
    {
        $staff = VitalSign::selectRaw('users.name as staff_name, COUNT(vital_signs.id) as vitals_count')
            ->join('users', 'vital_signs.taken_by', '=', 'users.id')
            ->where('vital_signs.measurement_date', '>=', Carbon::now()->subDays(30))
            ->groupBy('users.name')
            ->orderByDesc('vitals_count')
            ->limit(10)
            ->get();

        return $staff->map(function($member) {
            return [
                'name' => $member->staff_name,
                'vitals_count' => $member->vitals_count,
            ];
        })->toArray();
    }

    public function exportVitalsReport(PremiumReportService $premiumReportService)
    {
        $vitals = VitalSign::with(['resident', 'takenBy'])
            ->where('measurement_date', '>=', Carbon::now()->subDays(30))
            ->orderBy('measurement_date', 'desc')
            ->get();

        $reportData = [];
        foreach ($vitals as $vital) {
            $reportData[] = [
                'date' => $vital->measurement_date->format('Y-m-d'),
                'time' => $vital->created_at?->format('H:i') ?? '',
                'resident_name' => $vital->resident?->name ?? 'N/A',
                'systolic' => $vital->systolic,
                'diastolic' => $vital->diastolic,
                'pulse' => $vital->pulse,
                'temperature' => $vital->temperature,
                'oxygen_saturation' => $vital->oxygen_saturation,
                'bmi' => $vital->bmi,
                'taken_by' => $vital->takenBy?->name ?? 'N/A',
            ];
        }

        $facility = Facility::first();
        $branding = ReportBranding::palette($facility);

        $data = [
            'reportTitle' => 'Historical Vitals Report (30 Days)',
            'facilityName' => $facility?->name ?? 'Evergreen Care',
            'facilityAddress' => $facility?->address,
            'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
            'vitals' => $reportData,
            'exportedAt' => now()->format('M d, Y g:i A'),
            ...$branding
        ];

        $filename = 'Vitals_Report_' . now()->format('Y-m-d_H-i-s') . '.pdf';

        $pdfBinary = $premiumReportService->generate(
            'reports.premium-vitals-report',
            $data,
            $filename,
            ['orientation' => 'landscape']
        );

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
