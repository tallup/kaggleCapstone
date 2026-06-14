<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Filament\Actions\Action;
use App\Models\Resident;
use App\Models\User;
use App\Models\Branch;
use App\Models\VitalSign;
use App\Models\Assessment;
use App\Models\Appointment;
use App\Models\LeaveRequest;
use App\Models\Assignment;
use App\Filament\Widgets\ReportsStatsWidget;
use App\Filament\Widgets\FinancialSummaryWidget;
use App\Services\PremiumReportService;
use App\Support\ReportBranding;
use App\Models\Facility;
use Carbon\Carbon;
use Livewire\Attributes\Url;
use Filament\Notifications\Notification;

class Reports extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-document-text';
    protected static string $view = 'filament.pages.reports';
    protected static ?string $navigationLabel = 'Reports';
    protected static ?string $navigationGroup = 'Reports';
    protected static ?int $navigationSort = 7;

    #[Url]
    public $search = '';

    public $selectedResidentId = null;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('exportFinancial')
                ->label('Export Global Financial')
                ->icon('heroicon-o-currency-dollar')
                ->color('warning')
                ->action('exportFinancialReport'),

            Action::make('exportStaff')
                ->label('Export Staff Performance')
                ->icon('heroicon-o-user-group')
                ->color('success')
                ->action('exportStaffReport'),
        ];
    }

    public function getResidents()
    {
        return Resident::query()
            ->with(['branch'])
            ->when($this->search, function ($query) {
                $query->where('name', 'like', '%' . $this->search . '%')
                    ->orWhere('room', 'like', '%' . $this->search . '%');
            })
            ->limit(12) // Limit for performance, might need pagination or "load more"
            ->get();
    }

    public function selectResident($id)
    {
        $this->selectedResidentId = $id;
        $this->dispatch('open-modal', id: 'resident-report-hub');
    }

    public function exportResidentVitals(PremiumReportService $service)
    {
        if (!$this->selectedResidentId) return;

        $resident = Resident::findOrFail($this->selectedResidentId);
        $vitals = VitalSign::where('resident_id', $this->selectedResidentId)
            ->latest('measurement_date')
            ->limit(31)
            ->get();

        $facility = Facility::first();
        $branding = ReportBranding::palette($facility);

        $reportData = [];
        foreach ($vitals as $vital) {
            $reportData[] = [
                'date' => $vital->measurement_date->format('Y-m-d'),
                'time' => $vital->created_at?->format('H:i') ?? '',
                'systolic' => $vital->systolic,
                'diastolic' => $vital->diastolic,
                'pulse' => $vital->pulse,
                'temperature' => $vital->temperature,
                'oxygen' => $vital->oxygen_saturation,
                'weight' => $vital->weight,
                'taken_by' => $vital->takenBy?->name ?? 'N/A',
            ];
        }

        $data = [
            'reportTitle' => 'Vitals Log: ' . $resident->name,
            'facilityName' => $facility?->name ?? 'Evergreen Care',
            'facilityAddress' => $facility?->address,
            'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
            'vitals' => $reportData,
            'residentName' => $resident->name,
            'exportedAt' => now()->format('M d, Y g:i A'),
            ...$branding
        ];

        return response($service->generate('reports.premium-vitals-report', $data, null, ['orientation' => 'landscape']), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="Vitals_Log_' . str_replace(' ', '_', $resident->name) . '.pdf"',
        ])->send();
    }

    public function exportResidentMAR(PremiumReportService $service)
    {
        // This would use the MedicationLogReportService logic
        if (!$this->selectedResidentId) return;

        $resident = Resident::findOrFail($this->selectedResidentId);
        
        // Redirect to a route or call a service; for simplicity, I'll return a downloadable response
        // but typically this would hit the controller we looked at earlier.
        $startDate = now()->startOfMonth();
        $endDate = now()->endOfMonth();

        $medicationService = app(\App\Services\MedicationLogReportService::class);
        $data = $medicationService->buildViewData($resident, $startDate, $endDate);

        $pdfBinary = $service->generate(
            'reports.premium-medication-log',
            $data,
            'MAR_' . $resident->name . '.pdf',
            ['orientation' => 'landscape']
        );

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="MAR_' . str_replace(' ', '_', $resident->name) . '.pdf"',
        ])->send();
    }

    public function getStats(): array
    {
        return [
            'total_residents' => Resident::count(),
            'total_caregivers' => User::where('role', 'caregiver')->count(),
            'total_branches' => Branch::count(),
            'active_assignments' => Assignment::where('is_active', true)->count(),
            'pending_assessments' => Assessment::whereNotIn('status', ['approved', 'archived'])->count(),
            'today_vitals' => VitalSign::whereDate('measurement_date', today())->count(),
            'upcoming_appointments' => Appointment::whereDate('appointment_date', '>=', today())->count(),
            'pending_leave_requests' => LeaveRequest::where('status', 'pending')->count(),
        ];
    }

    public function getResidentCareData(): array
    {
        // Constrained eager load: only fetch the latest vital sign per resident
        $residents = Resident::with(['vitalSigns' => fn($q) => $q->latest('measurement_date')->limit(1)])->get();

        $healthStatus = [
            'excellent' => 0,
            'good' => 0,
            'fair' => 0,
            'poor' => 0,
        ];

        foreach ($residents as $resident) {
            $latestVitals = $resident->vitalSigns->first();
            
            if ($latestVitals) {
                if ($latestVitals->systolic <= 120 && $latestVitals->diastolic <= 80 && 
                    $latestVitals->pulse >= 60 && $latestVitals->pulse <= 100) {
                    $healthStatus['excellent']++;
                } elseif ($latestVitals->systolic <= 140 && $latestVitals->diastolic <= 90) {
                    $healthStatus['good']++;
                } elseif ($latestVitals->systolic <= 160 && $latestVitals->diastolic <= 100) {
                    $healthStatus['fair']++;
                } else {
                    $healthStatus['poor']++;
                }
            }
        }

        return [
            'labels' => ['Excellent', 'Good', 'Fair', 'Poor'],
            'data' => array_values($healthStatus),
            'colors' => ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
        ];
    }

    public function getStaffPerformanceData(): array
    {
        $caregivers = User::where('role', 'caregiver')
            ->withCount(['vitalSigns', 'assessments'])
            ->get();

        $performance = [];
        foreach ($caregivers as $caregiver) {
            $performance[] = [
                'name' => $caregiver->name,
                'vitals_recorded' => $caregiver->vital_signs_count,
                'assessments_completed' => $caregiver->assessments_count,
                'total_activities' => $caregiver->vital_signs_count + $caregiver->assessments_count,
            ];
        }

        return $performance;
    }

    public function getFinancialData(): array
    {
        // Mock financial data - in a real app, this would come from financial records
        return [
            'monthly_revenue' => 125000,
            'monthly_expenses' => 85000,
            'net_profit' => 40000,
            'resident_fees' => 95000,
            'staff_costs' => 45000,
            'facility_costs' => 25000,
            'other_expenses' => 15000,
        ];
    }

    public function exportResidentReport(PremiumReportService $premiumReportService)
    {
        $residents = Resident::with(['branch', 'vitalSigns' => function($query) {
            $query->latest('measurement_date')->limit(1);
        }])->get();

        $reportData = [];
        foreach ($residents as $resident) {
            $latestVitals = $resident->vitalSigns->first();
            $healthStatus = 'Unknown';
            
            if ($latestVitals) {
                if ($latestVitals->systolic <= 120 && $latestVitals->diastolic <= 80) {
                    $healthStatus = 'Excellent';
                } elseif ($latestVitals->systolic <= 140 && $latestVitals->diastolic <= 90) {
                    $healthStatus = 'Good';
                } elseif ($latestVitals->systolic <= 160 && $latestVitals->diastolic <= 100) {
                    $healthStatus = 'Fair';
                } else {
                    $healthStatus = 'Poor';
                }
            }

            $reportData[] = [
                'name' => $resident->name,
                'room' => $resident->room,
                'branch' => $resident->branch->name ?? 'N/A',
                'admission_date' => $resident->admission_date?->format('Y-m-d') ?? 'N/A',
                'status' => $resident->status,
                'last_vitals_date' => $latestVitals ? $latestVitals->measurement_date->format('Y-m-d') : 'N/A',
                'health_status' => $healthStatus,
            ];
        }

        $facility = Facility::first();
        $branding = ReportBranding::palette($facility);
        
        $data = [
            'reportTitle' => 'Resident Directory Report',
            'facilityName' => $facility?->name ?? 'Evergreen Care',
            'facilityAddress' => $facility?->address,
            'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
            'residents' => $reportData,
            'exportedAt' => now()->format('M d, Y g:i A'),
            ...$branding
        ];

        $filename = 'Resident_Report_' . now()->format('Y-m-d_H-i-s') . '.pdf';
        
        $pdfBinary = $premiumReportService->generate(
            'reports.premium-resident-report',
            $data,
            $filename,
            ['orientation' => 'landscape']
        );

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function exportStaffReport(PremiumReportService $premiumReportService)
    {
        $staff = User::where('role', 'caregiver')
            ->withCount(['vitalSigns', 'assessments'])
            ->get();

        $reportData = [];
        foreach ($staff as $member) {
            $vitalsCount = $member->vital_signs_count;
            $assessmentsCount = $member->assessments_count;
            $totalActivities = $vitalsCount + $assessmentsCount;
            $performanceScore = $totalActivities > 0 ? round(($totalActivities / 50) * 100, 1) : 0;
            
            $reportData[] = [
                'name' => $member->name,
                'email' => $member->email,
                'vitals_recorded' => $vitalsCount,
                'assessments_completed' => $assessmentsCount,
                'total_activities' => $totalActivities,
                'performance_score' => $performanceScore,
            ];
        }

        $facility = Facility::first();
        $branding = ReportBranding::palette($facility);

        $data = [
            'reportTitle' => 'Staff Performance Report',
            'facilityName' => $facility?->name ?? 'Evergreen Care',
            'facilityAddress' => $facility?->address,
            'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
            'staff' => $reportData,
            'exportedAt' => now()->format('M d, Y g:i A'),
            ...$branding
        ];

        $filename = 'Staff_Performance_Report_' . now()->format('Y-m-d_H-i-s') . '.pdf';

        $pdfBinary = $premiumReportService->generate(
            'reports.premium-staff-report',
            $data,
            $filename,
            ['orientation' => 'landscape']
        );

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function exportFinancialReport(PremiumReportService $premiumReportService)
    {
        $financialData = $this->getFinancialData();

        $facility = Facility::first();
        $branding = ReportBranding::palette($facility);

        $data = [
            'reportTitle' => 'Financial Summary Report',
            'facilityName' => $facility?->name ?? 'Evergreen Care',
            'facilityAddress' => $facility?->address,
            'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
            'financialData' => $financialData,
            'exportedAt' => now()->format('M d, Y g:i A'),
            ...$branding
        ];

        $filename = 'Financial_Report_' . now()->format('Y-m-d_H-i-s') . '.pdf';

        $pdfBinary = $premiumReportService->generate(
            'reports.premium-financial-report',
            $data,
            $filename
        );

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    protected function getHeaderWidgets(): array
    {
        return [
            ReportsStatsWidget::class,
            FinancialSummaryWidget::class,
        ];
    }
}
