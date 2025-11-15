<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CleaningAreaResource\Pages;
use App\Filament\Resources\CleaningAreaResource\RelationManagers;
use App\Models\CleaningArea;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class CleaningAreaResource extends Resource
{
    protected static ?string $model = CleaningArea::class;

    protected static ?string $navigationIcon = 'heroicon-o-sparkles';
    protected static ?string $navigationLabel = 'Housekeeping';
    protected static ?string $pluralModelLabel = 'Cleaning Areas';
    protected static ?string $modelLabel = 'Cleaning Area';
    protected static ?string $navigationGroup = 'Operations';
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
                Forms\Components\Section::make('Area Information')
                    ->schema([
                        Forms\Components\Select::make('branch_id')
                            ->relationship('branch', 'name')
                            ->label('Branch')
                            ->searchable()
                            ->required(),
                        Forms\Components\TextInput::make('name')
                            ->label('Area / Room Name')
                            ->maxLength(255)
                            ->required(),
                        Forms\Components\TextInput::make('shift_label')
                            ->label('Shift / Assignment Label')
                            ->placeholder('Float #1, Day Shift, etc.'),
                        Forms\Components\TextInput::make('location')
                            ->label('Location')
                            ->maxLength(255),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Description & Notes')
                    ->schema([
                        Forms\Components\Textarea::make('description')
                            ->rows(4)
                            ->placeholder('List responsibilities, staff reminders, etc.')
                            ->columnSpanFull(),
                    ]),

                Forms\Components\Section::make('Visibility & Order')
                    ->schema([
                        Forms\Components\TextInput::make('display_order')
                            ->numeric()
                            ->default(0)
                            ->helperText('Lower numbers appear first'),
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active')
                            ->default(true)
                            ->helperText('Inactive areas remain archived but hidden from daily lists'),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Area')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('branch.name')
                    ->label('Branch')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('shift_label')
                    ->label('Shift / Role')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('location')
                    ->label('Location')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('tasks_count')
                    ->counts('tasks')
                    ->label('Tasks')
                    ->sortable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->since()
                    ->label('Updated')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('branch_id')
                    ->relationship('branch', 'name')
                    ->label('Branch'),
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active Status')
                    ->placeholder('All')
                    ->trueLabel('Active only')
                    ->falseLabel('Inactive only'),
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
            RelationManagers\CleaningTasksRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCleaningAreas::route('/'),
            'create' => Pages\CreateCleaningArea::route('/create'),
            'edit' => Pages\EditCleaningArea::route('/{record}/edit'),
        ];
    }
}
