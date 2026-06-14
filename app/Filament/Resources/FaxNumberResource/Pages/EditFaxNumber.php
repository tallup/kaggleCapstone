<?php

namespace App\Filament\Resources\FaxNumberResource\Pages;

use App\Filament\Resources\FaxNumberResource;
use App\Models\FaxNumber;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFaxNumber extends EditRecord
{
    protected static string $resource = FaxNumberResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    /**
     * Enforce the "only one default fax number per facility" invariant. The
     * provider field is disabled on edit so we never need to revalidate it,
     * but is_default may flip on either side.
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        if (! empty($data['is_default'])) {
            $facilityId = $this->record->facility_id;

            if ($facilityId) {
                FaxNumber::withoutGlobalScopes()
                    ->where('facility_id', $facilityId)
                    ->where('id', '!=', $this->record->id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }
        }

        return $data;
    }
}
