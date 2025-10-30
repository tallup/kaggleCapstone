<?php

namespace App\Filament\Resources\MedicationAdministrationResource\Pages;

use App\Filament\Resources\MedicationAdministrationResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMedicationAdministrations extends ListRecords
{
    protected static string $resource = MedicationAdministrationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
            Actions\Action::make('open_medication_management')
                ->label('Medication Management')
                ->icon('heroicon-o-cube')
                ->color('primary')
                ->url(route('filament.admin.pages.medication-management')),
        ];
    }
}
