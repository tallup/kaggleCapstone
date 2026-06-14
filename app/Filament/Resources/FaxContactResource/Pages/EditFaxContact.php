<?php

namespace App\Filament\Resources\FaxContactResource\Pages;

use App\Filament\Resources\FaxContactResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFaxContact extends EditRecord
{
    protected static string $resource = FaxContactResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
