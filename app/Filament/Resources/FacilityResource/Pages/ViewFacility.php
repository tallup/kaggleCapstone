<?php

namespace App\Filament\Resources\FacilityResource\Pages;

use App\Filament\Resources\FacilityResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;
use Filament\Infolists;
use Filament\Infolists\Infolist;

class ViewFacility extends ViewRecord
{
    protected static string $resource = FacilityResource::class;

    /**
     * Get the header actions for the view page
     */
    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make()
                ->label('Edit Facility')
                ->icon('heroicon-o-pencil')
                ->color('primary'),
            
            Actions\DeleteAction::make()
                ->label('Delete Facility')
                ->icon('heroicon-o-trash')
                ->requiresConfirmation()
                ->modalHeading('Delete Facility')
                ->modalDescription('Are you sure you want to delete this facility? This action cannot be undone and will affect all associated branches and data.')
                ->modalSubmitActionLabel('Yes, Delete Facility')
                ->successNotificationTitle('Facility deleted successfully'),
        ];
    }

    /**
     * Build the infolist for viewing facility details
     */
    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Facility Information')
                    ->schema([
                        Infolists\Components\TextEntry::make('name')
                            ->label('Facility Name')
                            ->size(Infolists\Components\TextEntry\TextEntrySize::Large)
                            ->weight('bold')
                            ->icon('heroicon-o-building-office')
                            ->iconColor('primary'),
                        
                        Infolists\Components\TextEntry::make('location')
                            ->label('Location')
                            ->icon('heroicon-o-map-pin')
                            ->iconColor('success'),
                        
                        Infolists\Components\TextEntry::make('description')
                            ->label('Description')
                            ->columnSpanFull()
                            ->placeholder('No description provided'),
                        
                        Infolists\Components\IconEntry::make('is_active')
                            ->label('Status')
                            ->boolean()
                            ->trueIcon('heroicon-o-check-circle')
                            ->falseIcon('heroicon-o-x-circle')
                            ->trueColor('success')
                            ->falseColor('danger'),
                    ])
                    ->columns(2)
                    ->icon('heroicon-o-information-circle'),

                Infolists\Components\Section::make('Contact Information')
                    ->schema([
                        Infolists\Components\TextEntry::make('address')
                            ->label('Address')
                            ->icon('heroicon-o-map')
                            ->columnSpanFull()
                            ->placeholder('No address provided'),
                        
                        Infolists\Components\TextEntry::make('phone')
                            ->label('Phone')
                            ->icon('heroicon-o-phone')
                            ->placeholder('No phone provided')
                            ->copyable()
                            ->copyMessage('Phone number copied!')
                            ->copyMessageDuration(1500),
                        
                        Infolists\Components\TextEntry::make('email')
                            ->label('Email')
                            ->icon('heroicon-o-envelope')
                            ->placeholder('No email provided')
                            ->copyable()
                            ->copyMessage('Email copied!')
                            ->copyMessageDuration(1500),
                    ])
                    ->columns(2)
                    ->icon('heroicon-o-phone'),

                Infolists\Components\Section::make('Marketing Information')
                    ->schema([
                        Infolists\Components\TextEntry::make('brochure_url')
                            ->label('Brochure URL')
                            ->icon('heroicon-o-document-text')
                            ->placeholder('No brochure URL')
                            ->url(fn ($state) => $state)
                            ->openUrlInNewTab(),
                        
                        Infolists\Components\TextEntry::make('brochure_color')
                            ->label('Brochure Color Theme')
                            ->badge()
                            ->color(fn (string $state): string => match ($state) {
                                'blue' => 'info',
                                'green' => 'success',
                                'purple' => 'warning',
                                'red' => 'danger',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn (string $state): string => ucfirst($state)),
                    ])
                    ->columns(2)
                    ->icon('heroicon-o-document-duplicate'),

                Infolists\Components\Section::make('Branding & Customization')
                    ->schema([
                        Infolists\Components\ImageEntry::make('logo')
                            ->label('Facility Logo')
                            ->disk('public')
                            ->height(100)
                            ->placeholder('No logo uploaded')
                            ->columnSpanFull(),
                        
                        Infolists\Components\TextEntry::make('subdomain')
                            ->label('Subdomain')
                            ->icon('heroicon-o-globe-alt')
                            ->placeholder('No subdomain configured')
                            ->copyable(),
                        
                        Infolists\Components\TextEntry::make('provider_code')
                            ->label('Provider Code')
                            ->icon('heroicon-o-key')
                            ->placeholder('No provider code')
                            ->copyable(),
                        
                        Infolists\Components\ColorEntry::make('primary_color')
                            ->label('Primary Color')
                            ->placeholder('Not set'),
                        
                        Infolists\Components\ColorEntry::make('secondary_color')
                            ->label('Secondary Color')
                            ->placeholder('Not set'),
                        
                        Infolists\Components\ColorEntry::make('accent_color')
                            ->label('Accent Color')
                            ->placeholder('Not set'),
                    ])
                    ->columns(3)
                    ->icon('heroicon-o-paint-brush')
                    ->visible(fn () => auth()->user()->role === 'super_admin'),

                Infolists\Components\Section::make('Module Access')
                    ->schema([
                        Infolists\Components\TextEntry::make('enabled_modules')
                            ->label('Enabled Modules')
                            ->badge()
                            ->color('success')
                            ->state(function ($record) {
                                return $record->modules()
                                    ->where('is_enabled', true)
                                    ->pluck('module')
                                    ->map(fn ($module) => \App\Constants\Modules::getDisplayName($module))
                                    ->toArray();
                            })
                            ->placeholder('No modules enabled')
                            ->columnSpanFull(),
                        
                        Infolists\Components\TextEntry::make('disabled_modules')
                            ->label('Disabled Modules')
                            ->badge()
                            ->color('danger')
                            ->state(function ($record) {
                                $enabledModules = $record->modules()
                                    ->where('is_enabled', true)
                                    ->pluck('module')
                                    ->toArray();
                                
                                $allModules = array_keys(\App\Constants\Modules::all());
                                $disabledModules = array_diff($allModules, $enabledModules);
                                
                                return array_map(
                                    fn ($module) => \App\Constants\Modules::getDisplayName($module),
                                    $disabledModules
                                );
                            })
                            ->placeholder('All modules enabled')
                            ->columnSpanFull(),
                    ])
                    ->icon('heroicon-o-squares-2x2')
                    ->visible(fn () => auth()->user()->role === 'super_admin')
                    ->collapsible(),

                Infolists\Components\Section::make('Statistics')
                    ->schema([
                        Infolists\Components\TextEntry::make('branches_count')
                            ->label('Total Branches')
                            ->state(fn ($record) => $record->branches()->count())
                            ->icon('heroicon-o-building-office-2')
                            ->iconColor('primary')
                            ->badge()
                            ->color('primary'),
                        
                        Infolists\Components\TextEntry::make('users_count')
                            ->label('Total Users')
                            ->state(fn ($record) => $record->users()->count())
                            ->icon('heroicon-o-users')
                            ->iconColor('success')
                            ->badge()
                            ->color('success'),
                        
                        Infolists\Components\TextEntry::make('active_branches_count')
                            ->label('Active Branches')
                            ->state(fn ($record) => $record->branches()->where('is_active', true)->count())
                            ->icon('heroicon-o-check-circle')
                            ->iconColor('success')
                            ->badge()
                            ->color('success'),
                        
                        Infolists\Components\TextEntry::make('owner.name')
                            ->label('Registered By')
                            ->icon('heroicon-o-user')
                            ->placeholder('System'),
                    ])
                    ->columns(4)
                    ->icon('heroicon-o-chart-bar'),

                Infolists\Components\Section::make('System Information')
                    ->schema([
                        Infolists\Components\TextEntry::make('created_at')
                            ->label('Created At')
                            ->dateTime()
                            ->icon('heroicon-o-calendar'),
                        
                        Infolists\Components\TextEntry::make('updated_at')
                            ->label('Last Updated')
                            ->dateTime()
                            ->icon('heroicon-o-clock')
                            ->since(),
                    ])
                    ->columns(2)
                    ->icon('heroicon-o-information-circle')
                    ->collapsible()
                    ->collapsed(),
            ]);
    }

    /**
     * Get the page heading
     */
    public function getHeading(): string
    {
        return $this->record->name;
    }

    /**
     * Get the page subheading
     */
    public function getSubheading(): ?string
    {
        return $this->record->location;
    }
}
