<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;

class ViewVitals extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-document-text';
    protected static ?string $navigationGroup = 'Resident Care';
    protected static bool $shouldRegisterNavigation = false;

    protected static string $view = 'filament.pages.view-vitals';
}
