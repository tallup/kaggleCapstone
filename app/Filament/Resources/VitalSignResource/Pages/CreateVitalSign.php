<?php

namespace App\Filament\Resources\VitalSignResource\Pages;

use App\Filament\Resources\VitalSignResource;
use App\Models\VitalSign;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateVitalSign extends CreateRecord
{
    protected static string $resource = VitalSignResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Ensure taken_by is set
        $data['taken_by'] = auth()->id();

        // Ensure branch_id is set if resident is selected
        if (isset($data['resident_id']) && $data['resident_id']) {
            $resident = \App\Models\Resident::find($data['resident_id']);
            if ($resident && $resident->branch_id) {
                $data['branch_id'] = $resident->branch_id;
            }
        }

        // If branch_id is still not set, try to get it from the form data
        if (empty($data['branch_id']) && isset($data['branch_id'])) {
            // branch_id is already in the form data, keep it
        } elseif (empty($data['branch_id'])) {
            // If no branch_id is provided, we need to handle this
            // This should not happen if the form is working correctly
            throw new \Exception('Branch ID is required. Please select a resident or branch.');
        }

        return $data;
    }

    protected function afterCreate(): void
    {
        // Auto-determine status based on vital sign ranges
        $record = $this->record;
        $determinedStatus = $record->determineStatus();
        
        if ($determinedStatus !== $record->status) {
            $record->update(['status' => $determinedStatus]);
        }
    }

    protected function getFormActions(): array
    {
        $actions = parent::getFormActions();
        
        // Add confirmation to the create/save button
        foreach ($actions as $action) {
            if ($action instanceof Actions\CreateAction || $action->getName() === 'create') {
                $action->requiresConfirmation()
                    ->modalHeading('Create Vital Sign')
                    ->modalDescription('Are you sure you want to create this vital sign record?')
                    ->modalSubmitActionLabel('Yes, Create');
                break;
            }
        }
        
        return $actions;
    }
}
