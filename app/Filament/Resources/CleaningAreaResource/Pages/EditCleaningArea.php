<?php

namespace App\Filament\Resources\CleaningAreaResource\Pages;

use App\Filament\Resources\CleaningAreaResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCleaningArea extends EditRecord
{
    protected static string $resource = CleaningAreaResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
