<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\MedicationAdministration;
use App\Models\Resident;

class MedicationStatsWidget extends BaseWidget
{
    public ?int $selectedResident = null;

    protected function getStats(): array
    {
        try {
            $query = MedicationAdministration::query()
                ->when($this->selectedResident, function ($q) {
                    $q->where('resident_id', $this->selectedResident);
                })
                ->when(auth()->user()->hasRole('caregiver'), function ($q) {
                    $q->whereHas('resident', function ($r) {
                        $r->where('branch_id', auth()->user()->assigned_branch_id);
                    });
                });

            $completed = (clone $query)->where('status', 'completed')->count();
            $missed = (clone $query)->where('status', 'missed')->count();
            $refused = (clone $query)->where('status', 'refused')->count();
            $total = $query->count();
        } catch (\Exception $e) {
            \Log::error('Error in MedicationStatsWidget: ' . $e->getMessage());
            $completed = $missed = $refused = $total = 0;
        }

        return [
            Stat::make('Completed Medications', $completed)
                ->description('Successfully administered')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success')
                ->icon('heroicon-o-check-circle'),
            
            Stat::make('Missed Medications', $missed)
                ->description('Missed administrations')
                ->descriptionIcon('heroicon-m-clock')
                ->color('warning')
                ->icon('heroicon-o-clock'),
            
            Stat::make('Refused Medications', $refused)
                ->description('Refused by residents')
                ->descriptionIcon('heroicon-m-x-circle')
                ->color('danger')
                ->icon('heroicon-o-x-circle'),
            
            Stat::make('Total Administrations', $total)
                ->description('All medication records')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('primary')
                ->icon('heroicon-o-chart-bar'),
        ];
    }

    public function setSelectedResident(?int $residentId): void
    {
        $this->selectedResident = $residentId;
    }
}