<?php

namespace App\Filament\Resources\FaxProviderCatalogResource\Pages;

use App\Filament\Resources\FaxProviderCatalogResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFaxProviderCatalog extends EditRecord
{
    protected static string $resource = FaxProviderCatalogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
