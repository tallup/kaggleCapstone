<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\VitalSign;
use App\Models\Assessment;
use App\Models\Appointment;
use App\Models\LeaveRequest;

class ActivityStatsWidget extends BaseWidget
{
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 2,
    ];
    
    protected static ?string $pollingInterval = '60s';
    
    protected static ?int $sort = 6;

    protected function getStats(): array
    {
        try {
            return [
                Stat::make('Pending Assessments', $this->safeCount(function() {
                    return Assessment::whereNotIn('status', ['approved', 'archived']);
                }))
                    ->description('Awaiting completion')
                    ->descriptionIcon('heroicon-m-document-text')
                    ->color('warning'),
                
                Stat::make('Today\'s Vitals', $this->safeCount(function() {
                    return VitalSign::whereDate('measurement_date', today());
                }))
                    ->description('Vital signs recorded')
                    ->descriptionIcon('heroicon-m-heart')
                    ->color('danger'),
                
                Stat::make('Upcoming Appointments', $this->safeCount(function() {
                    return Appointment::whereDate('appointment_date', '>=', today());
                }))
                    ->description('Scheduled appointments')
                    ->descriptionIcon('heroicon-m-calendar-days')
                    ->color('info'),
                
                Stat::make('Pending Leave Requests', $this->safeCount(function() {
                    return LeaveRequest::where('status', 'pending');
                }))
                    ->description('Awaiting approval')
                    ->descriptionIcon('heroicon-m-clock')
                    ->color('warning'),
            ];
        } catch (\Exception $e) {
            \Log::error('ActivityStatsWidget error: ' . $e->getMessage());
            return [
                Stat::make('Error', 'N/A')
                    ->description('Unable to load stats')
                    ->color('danger'),
            ];
        }
    }

    private function safeCount(callable $callback)
    {
        try {
            return $callback()->count();
        } catch (\Exception $e) {
            return 0;
        }
    }
}
