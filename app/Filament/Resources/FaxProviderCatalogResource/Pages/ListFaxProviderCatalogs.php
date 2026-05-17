<?php

namespace App\Filament\Resources\FaxProviderCatalogResource\Pages;

use App\Filament\Resources\FaxProviderCatalogResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFaxProviderCatalogs extends ListRecords
{
    protected static string $resource = FaxProviderCatalogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
