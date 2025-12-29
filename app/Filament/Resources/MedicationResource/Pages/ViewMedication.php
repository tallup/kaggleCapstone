<?php

namespace App\Filament\Resources\MedicationResource\Pages;

use App\Filament\Resources\MedicationResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\IconEntry;

class ViewMedication extends ViewRecord
{
    protected static string $resource = MedicationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('open_medication_management')
                ->label('Medication Management')
                ->icon('heroicon-o-cube')
                ->color('primary')
                ->url(route('filament.admin.pages.medication-management')),
            Actions\Action::make('medication_history')
                ->label('Medication History')
                ->icon('heroicon-o-cube')
                ->color('info')
                ->url(fn () => route('filament.admin.pages.medication-history', [
                    'resident' => $this->record->resident_id,
                    'medication' => $this->record->id
                ]))
                ->openUrlInNewTab(),
            Actions\EditAction::make(),
            Actions\DeleteAction::make(),
        ];
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Medication Information')
                    ->schema([
                        TextEntry::make('resident.name')
                            ->label('Resident')
                            ->icon('heroicon-o-user'),
                        TextEntry::make('name')
                            ->label('Medication Name')
                            ->icon('heroicon-o-beaker'),
                        TextEntry::make('instructions')
                            ->label('Instructions')
                            ->formatStateUsing(fn (string $state): string => 
                                \App\Models\Medication::getInstructionOptions()[$state] ?? $state)
                            ->badge()
                            ->color('primary'),
                        TextEntry::make('quantity')
                            ->label('Quantity')
                            ->badge()
                            ->color('success'),
                    ])
                    ->columns(2),

                Section::make('Medication Schedule')
                    ->schema([
                        TextEntry::make('time_1')
                            ->label('Time 1')
                            ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->format('g:i A') : 'Not set')
                            ->icon('heroicon-o-clock')
                            ->visible(fn ($record) => $record->time_1),
                        TextEntry::make('time_2')
                            ->label('Time 2')
                            ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->format('g:i A') : 'Not set')
                            ->icon('heroicon-o-clock')
                            ->visible(fn ($record) => $record->time_2),
                        TextEntry::make('time_3')
                            ->label('Time 3')
                            ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->format('g:i A') : 'Not set')
                            ->icon('heroicon-o-clock')
                            ->visible(fn ($record) => $record->time_3),
                        TextEntry::make('time_4')
                            ->label('Time 4')
                            ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->format('g:i A') : 'Not set')
                            ->icon('heroicon-o-clock')
                            ->visible(fn ($record) => $record->time_4),
                    ])
                    ->columns(2)
                    ->visible(fn ($record) => $record->time_1 || $record->time_2 || $record->time_3 || $record->time_4),

                Section::make('Medical Information')
                    ->schema([
                        TextEntry::make('diagnosis')
                            ->label('Diagnosis')
                            ->placeholder('No diagnosis provided')
                            ->columnSpanFull(),
                        TextEntry::make('prescription_date')
                            ->label('Prescription Date')
                            ->date('M j, Y')
                            ->icon('heroicon-o-calendar'),
                        TextEntry::make('start_date')
                            ->label('Start Date')
                            ->date('M j, Y')
                            ->icon('heroicon-o-play'),
                        TextEntry::make('end_date')
                            ->label('End Date')
                            ->date('M j, Y')
                            ->icon('heroicon-o-stop')
                            ->placeholder('No end date set'),
                    ])
                    ->columns(2),

                Section::make('Additional Information')
                    ->schema([
                        TextEntry::make('notes')
                            ->label('Notes')
                            ->placeholder('No notes provided')
                            ->columnSpanFull(),
                        IconEntry::make('is_active')
                            ->label('Status')
                            ->boolean()
                            ->trueIcon('heroicon-o-check-circle')
                            ->falseIcon('heroicon-o-x-circle')
                            ->trueColor('success')
                            ->falseColor('danger'),
                        TextEntry::make('createdBy.name')
                            ->label('Created By')
                            ->icon('heroicon-o-user-circle'),
                        TextEntry::make('created_at')
                            ->label('Created At')
                            ->dateTime('M j, Y H:i')
                            ->icon('heroicon-o-clock'),
                    ])
                    ->columns(2),
            ]);
    }
}
