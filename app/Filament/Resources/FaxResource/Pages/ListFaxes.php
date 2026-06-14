<?php

namespace App\Filament\Resources\FaxResource\Pages;

use App\Filament\Resources\FaxResource;
use Filament\Resources\Pages\ListRecords;

class ListFaxes extends ListRecords
{
    protected static string $resource = FaxResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
