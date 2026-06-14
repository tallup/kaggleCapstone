<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\User;
use App\Filament\Widgets\MedicationStatsOverviewWidget;
use App\Filament\Widgets\MedicationComplianceWidget;
use App\Services\PremiumReportService;
use App\Support\ReportBranding;
use App\Models\Facility;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MedicationReports extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-cube';
    protected static string $view = 'filament.pages.medication-reports';
    protected static ?string $title = 'Medication Reports';
    protected static ?string $navigationLabel = 'Medication Reports';
    protected static ?string $navigationGroup = 'Reports';
    protected static ?int $navigationSort = 3;
    protected static bool $shouldRegisterNavigation = false;

    public static function canAccess(): bool
    {
        return Auth::check() && (Auth::user()->hasRole('administrator') || Auth::user()->hasRole('super_admin'));
    }

    public function mount(): void
    {
        if (request()->has('export')) {
            $response = $this->exportMedicationReport(app(PremiumReportService::class));
            if ($response) {
                $response->send();
                exit;
            }
        }
    }

    public function getMedicationStats(): array
    {
        $totalMedications = Medication::count();
        $activeMedications = Medication::where('is_active', true)->count();
        $totalAdministrations = MedicationAdministration::count();
        $todayAdministrations = MedicationAdministration::whereDate('administered_at', Carbon::today())->count();
        $missedDoses = MedicationAdministration::where('status', 'missed')->count();
        $pendingDoses = MedicationAdministration::where('status', 'pending')->count();

        return [
            'total_medications' => $totalMedications,
            'active_medications' => $activeMedications,
            'total_administrations' => $totalAdministrations,
            'today_administrations' => $todayAdministrations,
            'missed_doses' => $missedDoses,
            'pending_doses' => $pendingDoses,
        ];
    }

    public function getMedicationTrendsData(): array
    {
        $trends = MedicationAdministration::selectRaw('DATE(administered_at) as date, COUNT(*) as count')
            ->where('administered_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $labels = $trends->pluck('date')->map(fn($date) => Carbon::parse($date)->format('M d'))->toArray();
        $data = $trends->pluck('count')->toArray();

        return [
            'labels' => $labels,
            'data' => $data,
        ];
    }

    public function getMedicationTypeDistribution(): array
    {
        // Use dosage_form from the drugs table as medication type
        $types = Medication::selectRaw('drugs.dosage_form as medication_type, COUNT(*) as count')
            ->join('drugs', 'medications.drug_id', '=', 'drugs.id')
            ->groupBy('drugs.dosage_form')
            ->pluck('count', 'medication_type');

        $labels = $types->keys()->toArray();
        $data = $types->values()->toArray();
        $colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

        return [
            'labels' => $labels,
            'data' => $data,
            'colors' => $colors,
        ];
    }

    public function getAdministrationStatusDistribution(): array
    {
        $statuses = MedicationAdministration::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $labels = $statuses->keys()->map(fn($status) => ucfirst($status))->toArray();
        $data = $statuses->values()->toArray();
        $colors = ['#10B981', '#F59E0B', '#EF4444', '#6B7280']; // Completed, Pending, Missed, Other

        return [
            'labels' => $labels,
            'data' => $data,
            'colors' => $colors,
        ];
    }

    public function getTopResidentsByMedications(): array
    {
        $residents = Medication::selectRaw('residents.name as resident_name, COUNT(medications.id) as medication_count')
            ->join('residents', 'medications.resident_id', '=', 'residents.id')
            ->where('medications.is_active', true)
            ->groupBy('residents.name')
            ->orderByDesc('medication_count')
            ->limit(10)
            ->get();

        return $residents->map(function($resident) {
            return [
                'name' => $resident->resident_name,
                'medication_count' => $resident->medication_count,
            ];
        })->toArray();
    }

    public function getStaffMedicationPerformance(): array
    {
        $staff = MedicationAdministration::selectRaw('users.name as staff_name, COUNT(medication_administrations.id) as administrations_count')
            ->join('users', 'medication_administrations.administered_by', '=', 'users.id')
            ->where('medication_administrations.administered_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('users.name')
            ->orderByDesc('administrations_count')
            ->limit(10)
            ->get();

        return $staff->map(function($member) {
            return [
                'name' => $member->staff_name,
                'administrations_count' => $member->administrations_count,
            ];
        })->toArray();
    }

    public function getMedicationComplianceRate(): array
    {
        $totalScheduled = MedicationAdministration::where('administered_at', '>=', Carbon::now()->subDays(30))->count();
        $completed = MedicationAdministration::where('status', 'completed')
            ->where('administered_at', '>=', Carbon::now()->subDays(30))
            ->count();
        $missed = MedicationAdministration::where('status', 'missed')
            ->where('administered_at', '>=', Carbon::now()->subDays(30))
            ->count();

        $complianceRate = $totalScheduled > 0 ? round(($completed / $totalScheduled) * 100, 1) : 0;

        return [
            'compliance_rate' => $complianceRate,
            'total_scheduled' => $totalScheduled,
            'completed' => $completed,
            'missed' => $missed,
        ];
    }

    public function getMedicationsByTimeOfDay(): array
    {
        $timeData = MedicationAdministration::selectRaw('CAST(strftime("%H", administered_at) AS INTEGER) as hour, COUNT(*) as count')
            ->where('administered_at', '>=', Carbon::now()->subDays(30))
            ->where('status', 'completed')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        $labels = $timeData->pluck('hour')->map(fn($hour) => $hour . ':00')->toArray();
        $data = $timeData->pluck('count')->toArray();

        return [
            'labels' => $labels,
            'data' => $data,
        ];
    }

    public function exportMedicationReport(PremiumReportService $premiumReportService)
    {
        $medications = Medication::with(['resident', 'medicationAdministrations.administeredBy'])
            ->where('is_active', true)
            ->orderBy('resident_id')
            ->get();

        $reportData = [];
        foreach ($medications as $medication) {
            $lastAdmin = $medication->medicationAdministrations()
                ->where('status', 'completed')
                ->latest('administered_at')
                ->first();

            $reportData[] = [
                'resident_name' => $medication->resident?->name ?? '',
                'medication_name' => $medication->name,
                'medication_type' => $medication->drug?->dosage_form ?? 'Unknown',
                'strength' => $medication->drug?->strength ?? '',
                'dosage' => $medication->quantity ?? '',
                'frequency' => $medication->instructions ?? '',
                'start_date' => $medication->start_date?->format('Y-m-d') ?? '',
                'status' => $medication->is_active ? 'Active' : 'Inactive',
                'last_administered' => $lastAdmin?->administered_at?->format('Y-m-d H:i') ?? 'Never',
                'administered_by' => $lastAdmin?->administeredBy?->name ?? 'N/A',
            ];
        }

        $facility = Facility::first();
        $branding = ReportBranding::palette($facility);

        $data = [
            'reportTitle' => 'Active Medication Summary',
            'facilityName' => $facility?->name ?? 'Evergreen Care',
            'facilityAddress' => $facility?->address,
            'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
            'medications' => $reportData,
            'exportedAt' => now()->format('M d, Y g:i A'),
            ...$branding
        ];

        $filename = 'Medication_Summary_Report_' . now()->format('Y-m-d_H-i-s') . '.pdf';

        $pdfBinary = $premiumReportService->generate(
            'reports.premium-medication-report',
            $data,
            $filename,
            ['orientation' => 'landscape']
        );

        // We need to return the response directly, but mount() response might be ignored by Livewire.
        // However, in Filament, returning a response from mount or a called method usually works for downloads.
        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    protected function getHeaderWidgets(): array
    {
        return [
            MedicationStatsOverviewWidget::class,
            MedicationComplianceWidget::class,
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            \Filament\Actions\Action::make('open_medication_management')
                ->label('Medication Management')
                ->icon('heroicon-o-cube')
                ->color('primary')
                ->url(route('filament.admin.pages.medication-management')),
        ];
    }
}
