<?php

namespace App\Filament\Resources\MedicationResource\Pages;

use App\Filament\Resources\MedicationResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMedications extends ListRecords
{
    protected static string $resource = MedicationResource::class;

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
