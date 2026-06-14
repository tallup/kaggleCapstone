<?php

namespace App\Filament\Resources\FaxResource\Pages;

use App\Filament\Resources\FaxResource;
use Filament\Resources\Pages\ViewRecord;

class ViewFax extends ViewRecord
{
    protected static string $resource = FaxResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
