<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\Resident;
use App\Models\User;
use App\Models\Assessment;
use App\Models\VitalSign;

class ReportsStatsWidget extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Total Residents', Resident::count())
                ->description('Active residents in facility')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary')
                ->icon('heroicon-o-users'),
            
            Stat::make('Total Caregivers', User::where('role', 'caregiver')->count())
                ->description('Active care staff')
                ->descriptionIcon('heroicon-m-user')
                ->color('success')
                ->icon('heroicon-o-user'),
            
 Beth        Stat::make('Pending Assessments', Assessment::whereNotIn('status', ['approved', 'archived'])->count())
                ->description('Incomplete assessments')
                ->descriptionIcon('heroicon-m-document-text')
                ->color('warning')
                ->icon('heroicon-o-document-text'),
            
            Stat::make("Today's Vitals", VitalSign::whereDate('measurement_date', today())->count())
                ->description('Vitals recorded today')
                ->descriptionIcon('heroicon-m-heart')
                ->color('danger')
                ->icon('heroicon-o-heart'),
        ];
    }
}
