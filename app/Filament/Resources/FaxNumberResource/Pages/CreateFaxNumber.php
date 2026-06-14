<?php

namespace App\Filament\Resources\FaxNumberResource\Pages;

use App\Filament\Resources\FaxNumberResource;
use App\Models\FaxNumber;
use Filament\Resources\Pages\CreateRecord;

class CreateFaxNumber extends CreateRecord
{
    protected static string $resource = FaxNumberResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $user = auth()->user();

        if (! isset($data['facility_id']) && $user?->facility_id) {
            $data['facility_id'] = $user->facility_id;
        }

        if (! isset($data['created_by'])) {
            $data['created_by'] = $user?->id;
        }

        // Only one number per facility can be the default. If this one is being
        // promoted, demote everyone else in the same tenant first.
        if (! empty($data['is_default']) && ! empty($data['facility_id'])) {
            FaxNumber::withoutGlobalScopes()
                ->where('facility_id', $data['facility_id'])
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        return $data;
    }
}
