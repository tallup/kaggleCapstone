<?php

namespace App\Filament\Resources\FaxContactResource\Pages;

use App\Filament\Resources\FaxContactResource;
use Filament\Resources\Pages\CreateRecord;

class CreateFaxContact extends CreateRecord
{
    protected static string $resource = FaxContactResource::class;

    /**
     * Stamp the contact with the authenticated user's facility/user so the
     * row is reachable under FacilityScope. Super-admins working without a
     * facility context must select one downstream; this page assumes admins
     * are scoped to a facility.
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $user = auth()->user();

        if (! isset($data['facility_id']) && $user?->facility_id) {
            $data['facility_id'] = $user->facility_id;
        }

        if (! isset($data['created_by'])) {
            $data['created_by'] = $user?->id;
        }

        return $data;
    }
}
