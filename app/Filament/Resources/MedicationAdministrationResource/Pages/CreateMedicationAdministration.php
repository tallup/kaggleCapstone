<?php

namespace App\Filament\Resources\MedicationAdministrationResource\Pages;

use App\Filament\Resources\MedicationAdministrationResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use App\Models\Medication;

class CreateMedicationAdministration extends CreateRecord
{
    protected static string $resource = MedicationAdministrationResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['administered_by'] = auth()->id();
        
        // Ensure resident_id and branch_id are set if medication_id is provided
        if (isset($data['medication_id']) && !isset($data['resident_id'])) {
            $medication = \App\Models\Medication::find($data['medication_id']);
            if ($medication) {
                $data['resident_id'] = $medication->resident_id;
                $data['branch_id'] = $medication->resident->branch_id;
            }
        }
        
        // Ensure branch_id is set if resident_id is provided
        if (isset($data['resident_id']) && !isset($data['branch_id'])) {
            $resident = \App\Models\Resident::find($data['resident_id']);
            if ($resident) {
                $data['branch_id'] = $resident->branch_id;
            }
        }
        
        // Log the data for debugging
        \Log::info('Medication Administration Data:', $data);
        
        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function afterCreate(): void
    {
        // Show success notification
        \Filament\Notifications\Notification::make()
            ->title('Medication administration recorded successfully!')
            ->success()
            ->send();
    }

    protected function handleRecordCreation(array $data): \Illuminate\Database\Eloquent\Model
    {
        try {
            return parent::handleRecordCreation($data);
        } catch (\Exception $e) {
            \Log::error('Medication Administration Creation Error: ' . $e->getMessage());
            \Filament\Notifications\Notification::make()
                ->title('Error creating medication administration')
                ->body($e->getMessage())
                ->danger()
                ->send();
            throw $e;
        }
    }

    public function mount(): void
    {
        parent::mount();
        
        // Pre-fill medication if provided in URL
        $medicationId = request()->query('medication');
        if ($medicationId) {
            $medication = Medication::find($medicationId);
            if ($medication) {
                $this->form->fill([
                    'medication_id' => $medication->id,
                    'resident_id' => $medication->resident_id,
                    'branch_id' => $medication->resident->branch_id,
                    'administered_at' => now(),
                ]);
            }
        } else {
            // Always pre-fill current date/time
            $this->form->fill([
                'administered_at' => now(),
            ]);
        }
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
        $actions = parent::getFormActions();
        
        // Add confirmation to the create/save button
        foreach ($actions as $action) {
            if ($action instanceof Actions\CreateAction || $action->getName() === 'create') {
                $action->requiresConfirmation()
                    ->modalHeading('Create Medication Administration')
                    ->modalDescription('Are you sure you want to create this medication administration record?')
                    ->modalSubmitActionLabel('Yes, Create');
                break;
            }
        }
        
        return array_merge(
            $actions,
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