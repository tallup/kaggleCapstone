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
use Carbon\Carbon;

class Reports extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-document-text';
    protected static string $view = 'filament.pages.reports';
    protected static ?string $navigationLabel = 'Reports';
    protected static ?string $navigationGroup = 'Reports';
    protected static ?int $navigationSort = 7;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('exportResident')
                ->label('Export Resident Report')
                ->icon('heroicon-o-arrow-down-tray')
                ->color('primary')
                ->action('exportResidentReport'),
            
            Action::make('exportStaff')
                ->label('Export Staff Report')
                ->icon('heroicon-o-arrow-down-tray')
                ->color('success')
                ->action('exportStaffReport'),
            
            Action::make('exportFinancial')
                ->label('Export Financial Report')
                ->icon('heroicon-o-arrow-down-tray')
                ->color('warning')
                ->action('exportFinancialReport'),
        ];
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

    public function exportResidentReport()
    {
        $residents = Resident::with(['branch', 'vitalSigns' => function($query) {
            $query->latest('measurement_date')->limit(1);
        }])->get();

        $filename = 'resident_report_' . now()->format('Y-m-d_H-i-s') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($residents) {
            $file = fopen('php://output', 'w');
            
            // CSV Headers
            fputcsv($file, ['Name', 'Room', 'Branch', 'Admission Date', 'Status', 'Last Vitals Date', 'Health Status']);
            
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
                
                fputcsv($file, [
                    $resident->name,
                    $resident->room,
                    $resident->branch->name ?? 'N/A',
                    $resident->admission_date?->format('Y-m-d') ?? 'N/A',
                    $resident->status,
                    $latestVitals ? $latestVitals->measurement_date->format('Y-m-d') : 'N/A',
                    $healthStatus,
                ]);
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportStaffReport()
    {
        $staff = User::where('role', 'caregiver')
            ->withCount(['vitalSigns', 'assessments'])
            ->get();

        $filename = 'staff_report_' . now()->format('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($staff) {
            $file = fopen('php://output', 'w');

            // CSV Headers
            fputcsv($file, ['Name', 'Email', 'Vitals Recorded', 'Assessments Completed', 'Total Activities', 'Performance Score']);

            foreach ($staff as $member) {
                $vitalsCount = $member->vital_signs_count;
                $assessmentsCount = $member->assessments_count;
                $totalActivities = $vitalsCount + $assessmentsCount;
                $performanceScore = $totalActivities > 0 ? round(($totalActivities / 50) * 100, 1) : 0;
                
                fputcsv($file, [
                    $member->name,
                    $member->email,
                    $vitalsCount,
                    $assessmentsCount,
                    $totalActivities,
                    $performanceScore . '%',
                ]);
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportFinancialReport()
    {
        $financialData = $this->getFinancialData();

        $filename = 'financial_report_' . now()->format('Y-m-d_H-i-s') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($financialData) {
            $file = fopen('php://output', 'w');
            
            // CSV Headers
            fputcsv($file, ['Category', 'Amount', 'Percentage']);
            
            // Revenue
            fputcsv($file, ['Monthly Revenue', '$' . number_format($financialData['monthly_revenue']), '100%']);
            fputcsv($file, ['Resident Fees', '$' . number_format($financialData['resident_fees']), '76%']);
            
            // Expenses
            fputcsv($file, ['Monthly Expenses', '$' . number_format($financialData['monthly_expenses']), '68%']);
            fputcsv($file, ['Staff Costs', '$' . number_format($financialData['staff_costs']), '36%']);
            fputcsv($file, ['Facility Costs', '$' . number_format($financialData['facility_costs']), '20%']);
            fputcsv($file, ['Other Expenses', '$' . number_format($financialData['other_expenses']), '12%']);
            
            // Net Profit
            fputcsv($file, ['Net Profit', '$' . number_format($financialData['net_profit']), '32%']);
            
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    protected function getHeaderWidgets(): array
    {
        return [
            ReportsStatsWidget::class,
            FinancialSummaryWidget::class,
        ];
    }
}
