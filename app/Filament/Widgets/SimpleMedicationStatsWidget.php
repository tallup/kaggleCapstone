<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use App\Models\MedicationAdministration;

class SimpleMedicationStatsWidget extends BaseWidget
{
    protected function getStats(): array
    {
        try {
            // Get the selected resident from the parent page (MedicationHistory)
            $selectedResident = null;
            $parentPage = $this->getParent();
            
            // Try to get selectedResident from the page
            if ($parentPage && property_exists($parentPage, 'selectedResident')) {
                $selectedResident = $parentPage->selectedResident;
            }
            
            // Also check request parameter as fallback
            if (!$selectedResident && request()->has('resident')) {
                $selectedResident = request('resident');
            }
            
            // Build query with resident filter
            $query = MedicationAdministration::query();
            
            if ($selectedResident) {
                $query->where('resident_id', $selectedResident);
            }
            
            // Apply caregiver filter if needed
            if (auth()->user()->hasRole('caregiver')) {
                $query->whereHas('resident', function ($q) {
                    $q->where('branch_id', auth()->user()->assigned_branch_id);
                });
            }
            
            $completed = (clone $query)->where('status', 'completed')->count();
            $missed = (clone $query)->where('status', 'missed')->count();
            $refused = (clone $query)->where('status', 'refused')->count();
            $total = $query->count();
        } catch (\Exception $e) {
            \Log::error('Error in SimpleMedicationStatsWidget: ' . $e->getMessage());
            $completed = $missed = $refused = $total = 0;
        }

        return [
            Stat::make('Completed', $completed)
                ->description('Successfully administered')
                ->color('success')
                ->icon('heroicon-o-check-circle'),
            
            Stat::make('Missed', $missed)
                ->description('Missed administrations')
                ->color('warning')
                ->icon('heroicon-o-clock'),
            
            Stat::make('Refused', $refused)
                ->description('Refused by residents')
                ->color('danger')
                ->icon('heroicon-o-x-circle'),
            
            Stat::make('Total', $total)
                ->description('All medication records')
                ->color('primary')
                ->icon('heroicon-o-chart-bar'),
        ];
    }
}
