<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\Resident;
use App\Models\User;
use App\Models\Branch;
use App\Models\VitalSign;
use App\Models\Assessment;
use App\Models\Appointment;
use App\Models\LeaveRequest;
use App\Models\Assignment;

class ResidentStatsWidget extends BaseWidget
{
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 2,
    ];
    
    protected static ?int $sort = 5;
    protected static ?string $pollingInterval = '60s';

    protected function getStats(): array
    {
        try {
            return [
                Stat::make('Total Residents', $this->safeCount(Resident::class))
                    ->description('Active residents in care')
                    ->descriptionIcon('heroicon-m-users')
                    ->color('primary'),
                
                Stat::make('Total Caregivers', $this->safeCount(User::where('role', 'caregiver')))
                    ->description('Active staff members')
                    ->descriptionIcon('heroicon-m-user')
                    ->color('success'),
                
                Stat::make('Total Branches', $this->safeCount(Branch::class))
                    ->description('Facility locations')
                    ->descriptionIcon('heroicon-m-building-office')
                    ->color('info'),
                
                Stat::make('Active Assignments', $this->safeCount(Assignment::where('is_active', true)))
                    ->description('Current assignments')
                    ->descriptionIcon('heroicon-m-link')
                    ->color('warning'),
            ];
        } catch (\Exception $e) {
            \Log::error('ResidentStatsWidget error: ' . $e->getMessage());
            return [
                Stat::make('Error', 'N/A')
                    ->description('Unable to load stats')
                    ->color('danger'),
            ];
        }
    }

    private function safeCount($query)
    {
        try {
            if (is_string($query)) {
                return $query::count();
            }
            return $query->count();
        } catch (\Exception $e) {
            return 0;
        }
    }
}
