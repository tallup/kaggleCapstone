<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SleepRecordResource\Pages;
use App\Filament\Resources\SleepRecordResource\RelationManagers;
use App\Models\SleepRecord;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Actions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class SleepRecordResource extends Resource
{
    protected static ?string $model = SleepRecord::class;

    protected static ?string $navigationIcon = 'heroicon-o-moon';
    protected static ?string $navigationLabel = 'Sleep';
    protected static ?string $modelLabel = 'Sleep Record';
    protected static ?string $pluralModelLabel = 'Sleep Records';
    protected static ?string $navigationGroup = null;
    protected static bool $shouldRegisterNavigation = true;
    protected static ?int $navigationSort = 60;

    public static function canViewAny(): bool
    {
        return auth()->user()->hasPermission('view_sleep_records');
    }

    public static function canCreate(): bool
    {
        return auth()->user()->hasPermission('create_sleep_records');
    }

    public static function canEdit($record): bool
    {
        $user = auth()->user();
        return $user->hasPermission('edit_sleep_records') || $user->hasPermission('view_sleep_records');
    }

    public static function canDelete($record): bool
    {
        return auth()->user()->hasPermission('delete_sleep_records');
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        
        // If user is a caregiver, show sleep records for residents in their assigned branch only
        if (auth()->user()->hasRole('caregiver')) {
            $query->where('branch_id', auth()->user()->assigned_branch_id);
        }
        
        return $query;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Sleep Record Information')
                    ->schema([
                        Forms\Components\Select::make('branch_id')
                            ->label('Branch')
                            ->relationship('branch', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->placeholder('Choose a branch')
                            ->live()
                            ->afterStateUpdated(function ($state, callable $set) {
                                // Clear resident selection when branch changes
                                $set('resident_id', null);
                            }),
                        Forms\Components\Select::make('resident_id')
                            ->label('Resident')
                            ->options(function (callable $get) {
                                $branchId = $get('branch_id');
                                if (!$branchId) {
                                    return [];
                                }
                                return \App\Models\Resident::where('branch_id', $branchId)
                                    ->where('is_active', true)
                                    ->pluck('name', 'id')
                                    ->filter()
                                    ->toArray();
                            })
                            ->searchable()
                            ->required()
                            ->placeholder('Choose a resident')
                            ->disabled(fn (callable $get) => !$get('branch_id'))
                            ->helperText('Please select a branch first'),
                        Forms\Components\DatePicker::make('sleep_date')
                            ->label('Sleep Date')
                            ->required()
                            ->native(false)
                            ->displayFormat('M j, Y')
                            ->default(fn ($operation) => $operation === 'create' ? now() : null)
                            ->maxDate(now()),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('Sleep Times')
                    ->schema([
                        Forms\Components\TimePicker::make('sleep_time')
                            ->label('Sleep Time')
                            ->required()
                            ->displayFormat('h:i A')
                            ->format('H:i:s')
                            ->native(false)
                            ->seconds(false),
                        Forms\Components\TimePicker::make('wake_time')
                            ->label('Wake Time')
                            ->required()
                            ->displayFormat('h:i A')
                            ->format('H:i:s')
                            ->native(false)
                            ->seconds(false)
                            ->live()
                            ->afterStateUpdated(function ($state, callable $get, callable $set) {
                                $sleepTime = $get('sleep_time');
                                if ($sleepTime && $state) {
                                    $sleep = \Carbon\Carbon::createFromFormat('H:i', $sleepTime);
                                    $wake = \Carbon\Carbon::createFromFormat('H:i', $state);
                                    
                                    // Handle overnight sleep (wake time next day)
                                    if ($wake->lessThan($sleep)) {
                                        $wake->addDay();
                                    }
                                    
                                    $totalHours = $sleep->diffInHours($wake) + ($sleep->diffInMinutes($wake) % 60) / 60;
                                    $set('total_sleep_hours', round($totalHours, 2));
                                }
                            }),
                        Forms\Components\TextInput::make('total_sleep_hours')
                            ->label('Total Sleep Hours')
                            ->numeric()
                            ->step(0.1)
                            ->minValue(0)
                            ->maxValue(24)
                            ->suffix('hours')
                            ->readOnly()
                            ->helperText('Automatically calculated from sleep and wake times'),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('Sleep Quality & Notes')
                    ->schema([
                        Forms\Components\Select::make('sleep_quality')
                            ->label('Sleep Quality')
                            ->options([
                                1 => '1 - Very Poor',
                                2 => '2 - Poor',
                                3 => '3 - Fair',
                                4 => '4 - Below Average',
                                5 => '5 - Average',
                                6 => '6 - Above Average',
                                7 => '7 - Good',
                                8 => '8 - Very Good',
                                9 => '9 - Excellent',
                                10 => '10 - Perfect',
                            ])
                            ->placeholder('Select sleep quality (1-10)')
                            ->searchable(),
                        Forms\Components\TextInput::make('restlessness_episodes')
                            ->label('Restlessness Episodes')
                            ->numeric()
                            ->minValue(0)
                            ->default(0)
                            ->helperText('Number of times resident woke up or was restless'),
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->placeholder('Any additional notes about the sleep session...'),
                    ])
                    ->columns(3),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('branch.name')
                    ->label('Branch')
                    ->searchable()
                    ->sortable()
                    ->badge()
                    ->color('info'),
                Tables\Columns\TextColumn::make('sleep_date')
                    ->label('Date')
                    ->date('M j, Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('sleep_time')
                    ->label('Sleep Time')
                    ->time('h:i A')
                    ->sortable(),
                Tables\Columns\TextColumn::make('wake_time')
                    ->label('Wake Time')
                    ->time('h:i A')
                    ->sortable(),
                Tables\Columns\TextColumn::make('total_sleep_hours')
                    ->label('Duration')
                    ->suffix(' hrs')
                    ->sortable()
                    ->color(fn ($state) => match (true) {
                        $state >= 8 => 'success',
                        $state >= 6 => 'warning',
                        default => 'danger',
                    }),
                Tables\Columns\TextColumn::make('sleep_quality')
                    ->label('Quality')
                    ->formatStateUsing(fn ($state) => $state ? $state . '/10' : 'Not rated')
                    ->color(fn ($state) => match (true) {
                        $state >= 8 => 'success',
                        $state >= 6 => 'warning',
                        $state >= 1 => 'danger',
                        default => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('restlessness_episodes')
                    ->label('Restlessness')
                    ->badge()
                    ->color(fn ($state) => match (true) {
                        $state == 0 => 'success',
                        $state <= 2 => 'warning',
                        default => 'danger',
                    }),
                Tables\Columns\TextColumn::make('createdBy.name')
                    ->label('Recorded By')
                    ->searchable()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('branch_id')
                    ->label('Branch')
                    ->relationship('branch', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('resident_id')
                    ->label('Resident')
                    ->relationship('resident', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\Filter::make('sleep_date')
                    ->form([
                        Forms\Components\DatePicker::make('from')
                            ->label('From Date'),
                        Forms\Components\DatePicker::make('until')
                            ->label('Until Date'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('sleep_date', '>=', $date),
                            )
                            ->when(
                                $data['until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('sleep_date', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('sleep_date', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSleepRecords::route('/'),
            'create' => Pages\CreateSleepRecord::route('/create'),
            'edit' => Pages\EditSleepRecord::route('/{record}/edit'),
        ];
    }

    public static function getHeaderActions(): array
    {
        return [
            Actions\Action::make('chart_reports')
                ->label('View Charts')
                ->icon('heroicon-o-chart-bar')
                ->color('info')
                ->url(route('filament.admin.pages.sleep-charts'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
        ];
    }
}
