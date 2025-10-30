<?php

namespace App\Filament\Resources\MedicationAdministrationResource\Pages;

use App\Filament\Resources\MedicationAdministrationResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditMedicationAdministration extends EditRecord
{
    protected static string $resource = MedicationAdministrationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('open_medication_management')
                ->label('Medication Management')
                ->icon('heroicon-o-cube')
                ->color('primary')
                ->url(route('filament.admin.pages.medication-management')),
            Actions\DeleteAction::make(),
        ];
    }

    protected function getFormActions(): array
    {
        return array_merge(
            parent::getFormActions(),
            [
                Actions\Action::make('back_to_management')
                    ->label('Back to Medication Management')
                    ->icon('heroicon-o-arrow-uturn-left')
                    ->color('gray')
                    ->url(route('filament.admin.pages.medication-management')),
            ]
        );
    }
}
