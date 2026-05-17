<?php

namespace App\Filament\Resources\FaxNumberResource\Pages;

use App\Filament\Resources\FaxNumberResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFaxNumbers extends ListRecords
{
    protected static string $resource = FaxNumberResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
