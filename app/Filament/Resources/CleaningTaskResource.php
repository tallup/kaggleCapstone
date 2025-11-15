<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CleaningTaskResource\Pages;
use App\Filament\Resources\CleaningTaskResource\RelationManagers;
use App\Models\CleaningTask;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class CleaningTaskResource extends Resource
{
    protected static ?string $model = CleaningTask::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';
    protected static ?string $navigationGroup = 'Operations';
    protected static ?string $navigationLabel = 'Cleaning Tasks';
    protected static ?string $pluralModelLabel = 'Cleaning Tasks';
    protected static ?string $modelLabel = 'Cleaning Task';
    protected static bool $shouldRegisterNavigation = false;

    public static function shouldRegisterNavigation(): bool
    {
        return false;
    }

    public static function canViewAny(): bool
    {
        return auth()->check() && auth()->user()->hasPermission('view_cleaning_areas');
    }

    public static function canCreate(): bool
    {
        return auth()->check() && auth()->user()->hasPermission('create_cleaning_areas');
    }

    public static function canEdit($record): bool
    {
        return auth()->check() && auth()->user()->hasPermission('edit_cleaning_areas');
    }

    public static function canDelete($record): bool
    {
        return auth()->check() && auth()->user()->hasPermission('delete_cleaning_areas');
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Task Details')
                    ->schema([
                        Forms\Components\Select::make('cleaning_area_id')
                            ->relationship('area', 'name')
                            ->label('Cleaning Area')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Forms\Components\TextInput::make('title')
                            ->label('Task Title')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\Textarea::make('instructions')
                            ->rows(3)
                            ->placeholder('Describe how the task should be completed')
                            ->columnSpanFull(),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Schedule')
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
                            ->label('Start Window')
                            ->seconds(false),
                        Forms\Components\TimePicker::make('window_end')
                            ->label('End Window')
                            ->seconds(false),
                        Forms\Components\CheckboxList::make('days_of_week')
                            ->label('Days of Week / Day Numbers')
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
                        Forms\Components\TextInput::make('display_order')
                            ->numeric()
                            ->label('Display Order')
                            ->default(0),
                        Forms\Components\TextInput::make('estimated_minutes')
                            ->numeric()
                            ->label('Estimated Minutes')
                            ->minValue(1)
                            ->maxValue(240),
                    ])
                    ->columns(3),

                Forms\Components\Section::make('Settings')
                    ->schema([
                        Forms\Components\Toggle::make('is_required')
                            ->label('Required before shift ends')
                            ->default(true),
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active Task')
                            ->default(true),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('area.name')
                    ->label('Area')
                    ->sortable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('title')
                    ->label('Task')
                    ->sortable()
                    ->searchable()
                    ->wrap(),
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
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->since()
                    ->label('Updated')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('cleaning_area_id')
                    ->relationship('area', 'name')
                    ->label('Area'),
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active Status'),
                Tables\Filters\TernaryFilter::make('is_required')
                    ->label('Required'),
                Tables\Filters\SelectFilter::make('frequency')
                    ->options([
                        'daily' => 'Daily',
                        'weekly' => 'Weekly',
                        'monthly' => 'Monthly',
                        'adhoc' => 'Ad hoc',
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\AssignmentsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCleaningTasks::route('/'),
            'create' => Pages\CreateCleaningTask::route('/create'),
            'edit' => Pages\EditCleaningTask::route('/{record}/edit'),
        ];
    }
}
