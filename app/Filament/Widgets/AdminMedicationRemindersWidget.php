<?php

namespace App\Filament\Widgets;

use Filament\Widgets\TableWidget as BaseWidget;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Actions\Action;
use App\Models\Medication;
use Carbon\Carbon;

class AdminMedicationRemindersWidget extends BaseWidget
{
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 1,
    ];
    protected static ?string $heading = 'Medication Reminders';
    protected static ?string $description = 'Next 24 Hours';
    protected static ?int $sort = 9;
    protected static ?string $pollingInterval = '60s';

    public function table(Table $table): Table
    {
        $today = Carbon::today();
        
        return $table
            ->query(
                Medication::with(['resident', 'drug'])
                    ->where('is_active', true)
                    ->where(function ($q) use ($today) {
                        $q->whereDate('start_date', '<=', $today)
                          ->where(function ($qq) use ($today) {
                              $qq->whereNull('end_date')->orWhereDate('end_date', '>=', $today);
                          });
                    })
                    ->limit(15)
            )
            ->searchable()
            ->defaultSort('resident.name')
            ->columns([
                TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable()
                    ->icon('heroicon-o-user')
                    ->iconColor('primary')
                    ->weight('medium'),
                
                TextColumn::make('name')
                    ->label('Medication')
                    ->searchable()
                    ->sortable()
                    ->icon('heroicon-o-beaker')
                    ->iconColor('warning'),
                
                TextColumn::make('drug.name')
                    ->label('Drug')
                    ->limit(20)
                    ->placeholder('Not specified'),
                
                TextColumn::make('dosage')
                    ->label('Dosage')
                    ->badge()
                    ->color('info'),
                
                TextColumn::make('instructions')
                    ->label('Frequency')
                    ->formatStateUsing(fn (string $state): string => strtoupper($state))
                    ->badge()
                    ->color('success'),
                
                TextColumn::make('scheduled_times')
                    ->label('Times Today')
                    ->getStateUsing(function ($record) {
                        $times = collect([$record->time_1, $record->time_2, $record->time_3, $record->time_4])
                            ->filter()
                            ->map(fn ($t) => Carbon::parse($t)->format('g:i A'))
                            ->implode(', ');
                        return $times ?: 'As needed';
                    })
                    ->limit(30)
                    ->tooltip(function ($record) {
                        return collect([$record->time_1, $record->time_2, $record->time_3, $record->time_4])
                            ->filter()
                            ->map(fn ($t) => Carbon::parse($t)->format('g:i A'))
                            ->implode(', ');
                    }),
            ])
            ->actions([
                Action::make('view')
                    ->label('View')
                    ->icon('heroicon-o-eye')
                    ->color('info')
                    ->url(fn (Medication $record): string => route('filament.admin.resources.medications.edit', $record)),
            ])
            ->emptyStateHeading('No Active Medications')
            ->emptyStateDescription('Active medication schedules will appear here.')
            ->emptyStateIcon('heroicon-o-beaker');
    }
}

