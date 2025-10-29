<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Filament\Widgets\MedicationStatsWidget;
use App\Filament\Widgets\ActiveMedicationsWidget;
use App\Filament\Widgets\RecentMedicationsWidget;

class MedicationManagement extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-cube';
    protected static string $view = 'filament.pages.medication-management';
    protected static ?string $title = 'Medication Management';
    protected static ?string $navigationLabel = 'Medication';
    protected static ?int $navigationSort = 4;
    protected static bool $shouldRegisterNavigation = true;
    protected static ?string $navigationGroup = null;

    public function getWidgets(): array
    {
        return [
            MedicationStatsWidget::class,
            ActiveMedicationsWidget::class,
            RecentMedicationsWidget::class,
        ];
    }
}

