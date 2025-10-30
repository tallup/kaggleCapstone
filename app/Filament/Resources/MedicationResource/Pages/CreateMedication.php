<?php

namespace App\Filament\Resources\MedicationResource\Pages;

use App\Filament\Resources\MedicationResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;

class CreateMedication extends CreateRecord
{
    protected static string $resource = MedicationResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = Auth::id();
        
        // Automatically set branch_id from resident if not already set
        if (isset($data['resident_id']) && !isset($data['branch_id'])) {
            $resident = \App\Models\Resident::find($data['resident_id']);
            if ($resident && $resident->branch_id) {
                $data['branch_id'] = $resident->branch_id;
            }
        }
        
        // Ensure name is set if not provided
        if (empty($data['name'])) {
            $drug = \App\Models\Drug::find($data['drug_id'] ?? null);
            $resident = \App\Models\Resident::find($data['resident_id'] ?? null);
            if ($drug && $resident) {
                $data['name'] = $drug->name . ' - ' . $resident->name;
            }
        }
        
        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('open_medication_management')
                ->label('Medication Management')
                ->icon('heroicon-o-cube')
                ->color('primary')
                ->url(route('filament.admin.pages.medication-management')),
        ];
    }

    protected function getFormActions(): array
    {
        // Show the default create/cancel actions plus a back-to-management button in the footer
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
