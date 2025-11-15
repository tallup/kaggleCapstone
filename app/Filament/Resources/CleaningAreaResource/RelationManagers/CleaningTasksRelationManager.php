<?php

namespace App\Filament\Resources\CleaningAreaResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;

class CleaningTasksRelationManager extends RelationManager
{
    protected static string $relationship = 'tasks';

    public function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('title')
                ->label('Task Title')
                ->maxLength(255)
                ->required(),
            Forms\Components\Textarea::make('instructions')
                ->label('Instructions / Notes')
                ->rows(3)
                ->columnSpanFull(),
            Forms\Components\Fieldset::make('Scheduling')
                ->schema([
                    Forms\Components\Select::make('frequency')
                        ->label('Frequency')
                        ->options([
                            'daily' => 'Daily',
                            'weekly' => 'Weekly',
                            'monthly' => 'Monthly',
                            'adhoc' => 'Ad hoc',
                        ])
                        ->default('daily')
                        ->required(),
                    Forms\Components\TimePicker::make('window_start')
                        ->label('Start window')
                        ->seconds(false),
                    Forms\Components\TimePicker::make('window_end')
                        ->label('End window')
                        ->seconds(false),
                    Forms\Components\CheckboxList::make('days_of_week')
                        ->label('Days of week')
                        ->options([
                            'sunday' => 'Sunday',
                            'monday' => 'Monday',
                            'tuesday' => 'Tuesday',
                            'wednesday' => 'Wednesday',
                            'thursday' => 'Thursday',
                            'friday' => 'Friday',
                            'saturday' => 'Saturday',
                        ])
                        ->columns(3)
                        ->helperText('Leave empty for every day'),
                ])
                ->columns(3),
            Forms\Components\Fieldset::make('Task Settings')
                ->schema([
                    Forms\Components\Toggle::make('is_required')
                        ->label('Required before shift ends')
                        ->default(true),
                    Forms\Components\Toggle::make('is_active')
                        ->label('Active task')
                        ->default(true),
                    Forms\Components\TextInput::make('display_order')
                        ->label('Display Order')
                        ->numeric()
                        ->default(0),
                    Forms\Components\TextInput::make('estimated_minutes')
                        ->numeric()
                        ->label('Est. Minutes')
                        ->minValue(1)
                        ->maxValue(240),
                ])
                ->columns(4),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('title')
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Task')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('frequency')
                    ->label('Frequency')
                    ->badge()
                    ->color(fn (string $state) => match ($state) {
                        'daily' => 'success',
                        'weekly' => 'info',
                        'monthly' => 'warning',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state) => ucfirst($state)),
                Tables\Columns\TextColumn::make('days_of_week')
                    ->label('Days')
                    ->formatStateUsing(function ($state) {
                        if (empty($state)) {
                            return 'All';
                        }
                        return collect(is_array($state) ? $state : [])
                            ->map(fn ($day) => ucfirst(substr($day, 0, 3)))
                            ->join(', ');
                    })
                    ->toggleable(),
                Tables\Columns\TextColumn::make('window_start')
                    ->label('Window')
                    ->formatStateUsing(function ($state, $record) {
                        $start = $record->window_start ? date('g:i A', strtotime($record->window_start)) : null;
                        $end = $record->window_end ? date('g:i A', strtotime($record->window_end)) : null;
                        if (!$start && !$end) {
                            return 'Anytime';
                        }
                        return trim(($start ?? 'Start') . ' – ' . ($end ?? 'End'));
                    })
                    ->toggleable(),
                Tables\Columns\IconColumn::make('is_required')
                    ->label('Required')
                    ->boolean(),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('display_order')
                    ->label('Order')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active Status'),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}

