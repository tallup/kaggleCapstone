<?php

namespace App\Filament\Resources\CleaningTaskResource\Pages;

use App\Filament\Resources\CleaningTaskResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListCleaningTasks extends ListRecords
{
    protected static string $resource = CleaningTaskResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
