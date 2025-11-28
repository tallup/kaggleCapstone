<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use App\Models\Resident;
use App\Models\Appointment;
use App\Models\Medication;
use App\Models\VitalSign;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class AdminTrendsChartWidget extends ChartWidget
{
    protected static ?string $heading = '7-Day Trends Overview';
    protected static ?string $description = 'Multi-metric trends comparison';
    protected static ?int $sort = 10;
    protected static ?string $pollingInterval = '60s';
    
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 2,
    ];

    protected function getData(): array
    {
        return Cache::remember('admin.trends.chart', 300, function () {
            $weekStart = now()->startOfWeek();
            $labels = [];
            $residentData = [];
            $appointmentData = [];
            $medicationData = [];
            $vitalData = [];
            
            for ($i = 0; $i < 7; $i++) {
                $date = $weekStart->copy()->addDays($i);
                $labels[] = $date->format('M j');
                $dateStr = $date->format('Y-m-d');
                
                // Residents
                $residentData[] = Resident::whereDate('created_at', $dateStr)
                    ->where('is_active', true)
                    ->count();
                
                // Appointments
                $appointmentData[] = Appointment::whereDate('appointment_date', $dateStr)
                    ->whereNotIn('status', ['cancelled', 'completed'])
                    ->count();
                
                // Medications
                $medicationData[] = Medication::whereDate('created_at', $dateStr)
                    ->where('is_active', true)
                    ->count();
                
                // Vital signs
                $vitalData[] = VitalSign::whereDate('measurement_date', $dateStr)->count();
            }
            
            return [
                'datasets' => [
                    [
                        'label' => 'Residents',
                        'data' => $residentData,
                        'borderColor' => 'rgb(59, 130, 246)',
                        'backgroundColor' => 'rgba(59, 130, 246, 0.1)',
                        'tension' => 0.4,
                        'fill' => true,
                    ],
                    [
                        'label' => 'Appointments',
                        'data' => $appointmentData,
                        'borderColor' => 'rgb(16, 185, 129)',
                        'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                        'tension' => 0.4,
                        'fill' => true,
                    ],
                    [
                        'label' => 'Medications',
                        'data' => $medicationData,
                        'borderColor' => 'rgb(245, 158, 11)',
                        'backgroundColor' => 'rgba(245, 158, 11, 0.1)',
                        'tension' => 0.4,
                        'fill' => true,
                    ],
                    [
                        'label' => 'Vital Signs',
                        'data' => $vitalData,
                        'borderColor' => 'rgb(239, 68, 68)',
                        'backgroundColor' => 'rgba(239, 68, 68, 0.1)',
                        'tension' => 0.4,
                        'fill' => true,
                    ],
                ],
                'labels' => $labels,
            ];
        });
    }

    protected function getType(): string
    {
        return 'line';
    }
    
    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'display' => true,
                    'position' => 'top',
                ],
            ],
            'scales' => [
                'y' => [
                    'beginAtZero' => true,
                    'ticks' => [
                        'stepSize' => 1,
                    ],
                ],
            ],
            'responsive' => true,
            'maintainAspectRatio' => false,
        ];
    }
}

