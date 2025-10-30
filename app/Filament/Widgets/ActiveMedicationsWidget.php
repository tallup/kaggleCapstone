<?php

namespace App\Filament\Widgets;

use App\Models\Medication;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Actions\Action;
use Filament\Widgets\TableWidget;

class ActiveMedicationsWidget extends TableWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?string $heading = 'Active Medications';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Medication::with(['resident', 'createdBy'])
                    ->where('is_active', true)
                    ->latest('prescription_date')
            )
            ->columns([
                TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                
                TextColumn::make('name')
                    ->label('Medication')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                
                TextColumn::make('instructions')
                    ->label('Instructions')
                    ->formatStateUsing(fn (string $state): string => Medication::getInstructionOptions()[$state] ?? $state)
                    ->badge()
                    ->color('primary'),
                
                TextColumn::make('medication_times')
                    ->label('Times')
                    ->formatStateUsing(function ($record) {
                        try {
                            $times = [];
                            if ($record->time_1) {
                                $time = is_string($record->time_1) ? $record->time_1 : $record->time_1->format('H:i:s');
                                $times[] = \Carbon\Carbon::parse($time)->format('g:i A');
                            }
                            if ($record->time_2) {
                                $time = is_string($record->time_2) ? $record->time_2 : $record->time_2->format('H:i:s');
                                $times[] = \Carbon\Carbon::parse($time)->format('g:i A');
                            }
                            if ($record->time_3) {
                                $time = is_string($record->time_3) ? $record->time_3 : $record->time_3->format('H:i:s');
                                $times[] = \Carbon\Carbon::parse($time)->format('g:i A');
                            }
                            if ($record->time_4) {
                                $time = is_string($record->time_4) ? $record->time_4 : $record->time_4->format('H:i:s');
                                $times[] = \Carbon\Carbon::parse($time)->format('g:i A');
                            }
                            if (empty($times) && $record->instructions) {
                                $defaults = [
                                    'a.m' => ['08:00'],
                                    'p.m' => ['20:00'],
                                    'h.s' => ['22:00'],
                                    'b.i.d' => ['08:00', '20:00'],
                                    't.i.d' => ['08:00', '14:00', '20:00'],
                                    'q.i.d' => ['08:00', '12:00', '16:00', '20:00'],
                                ];
                                $key = strtolower(trim($record->instructions));
                                if (isset($defaults[$key])) {
                                    $times = array_map(fn($s) => \Carbon\Carbon::parse($s)->format('g:i A'), $defaults[$key]);
                                }
                            }
                            return implode(', ', $times);
                        } catch (\Exception $e) {
                            return 'N/A';
                        }
                    })
                    ->limit(30)
                    ->tooltip(function (TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 30 ? $state : null;
                    }),
                
                TextColumn::make('quantity')
                    ->label('Quantity')
                    ->badge()
                    ->color('success'),
                
                TextColumn::make('prescription_date')
                    ->label('Prescribed')
                    ->date('M j, Y')
                    ->sortable(),
                
                TextColumn::make('end_date')
                    ->label('End Date')
                    ->date('M j, Y')
                    ->sortable()
                    ->color(fn ($record) => $record->end_date && $record->end_date <= now()->addDays(7) ? 'warning' : null),
            ])
            ->actions([
                Action::make('view')
                    ->label('View')
                    ->icon('heroicon-o-eye')
                    ->url(fn (Medication $record): string => route('filament.admin.resources.medications.view', $record))
                    ->openUrlInNewTab(),
                
                Action::make('edit')
                    ->label('Edit')
                    ->icon('heroicon-o-pencil')
                    ->url(fn (Medication $record): string => route('filament.admin.resources.medications.edit', $record))
                    ->openUrlInNewTab(),
                
                Action::make('administer')
                    ->label('Administer')
                    ->icon('heroicon-o-beaker')
                    ->color('success')
                    ->url(fn (Medication $record): string => route('filament.admin.resources.medication-administrations.create', ['medication' => $record->id]))
                    ->openUrlInNewTab(),
            ]);
    }
}








