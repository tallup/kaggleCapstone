<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VitalRangeResource\Pages;
use App\Filament\Resources\VitalRangeResource\RelationManagers;
use App\Models\VitalRange;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class VitalRangeResource extends Resource
{
    protected static ?string $model = VitalRange::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';
    protected static ?string $navigationGroup = 'Administration';
    protected static ?int $navigationSort = 100;
    protected static bool $shouldRegisterNavigation = true;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Vital Range Information')
                    ->schema([
                        Forms\Components\Select::make('parameter')
                            ->label('Parameter')
                            ->options([
                                'systolic' => 'Systolic',
                                'diastolic' => 'Diastolic',
                                'temperature' => 'Temperature',
                                'pulse' => 'Pulse',
                                'oxygen_saturation' => 'Oxygen Saturation',
                            ])
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->searchable(),
                        Forms\Components\TextInput::make('unit')
                            ->label('Unit')
                            ->placeholder('mmHg, °F, BPM, %')
                            ->maxLength(50),
                        Forms\Components\Textarea::make('description')
                            ->label('Description')
                            ->rows(3)
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Normal Range')
                    ->schema([
                        Forms\Components\TextInput::make('min_normal')
                            ->label('Min Normal')
                            ->numeric()
                            ->step(0.01),
                        Forms\Components\TextInput::make('max_normal')
                            ->label('Max Normal')
                            ->numeric()
                            ->step(0.01),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Warning Range')
                    ->schema([
                        Forms\Components\TextInput::make('min_warning')
                            ->label('Min Warning')
                            ->numeric()
                            ->step(0.01),
                        Forms\Components\TextInput::make('max_warning')
                            ->label('Max Warning')
                            ->numeric()
                            ->step(0.01),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Critical Range')
                    ->schema([
                        Forms\Components\TextInput::make('min_critical')
                            ->label('Min Critical')
                            ->numeric()
                            ->step(0.01),
                        Forms\Components\TextInput::make('max_critical')
                            ->label('Max Critical')
                            ->numeric()
                            ->step(0.01),
                    ])
                    ->columns(2),
                
                Forms\Components\Toggle::make('is_active')
                    ->label('Active')
                    ->default(true),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('parameter')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('min_normal')
                    ->label('Min Normal')
                    ->numeric(decimalPlaces: 2),
                Tables\Columns\TextColumn::make('max_normal')
                    ->label('Max Normal')
                    ->numeric(decimalPlaces: 2),
                Tables\Columns\TextColumn::make('unit')
                    ->searchable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('parameter')
                    ->options([
                        'systolic' => 'Systolic',
                        'diastolic' => 'Diastolic',
                        'temperature' => 'Temperature',
                        'pulse' => 'Pulse',
                        'oxygen_saturation' => 'Oxygen Saturation',
                    ]),
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active')
                    ->placeholder('All')
                    ->trueLabel('Active only')
                    ->falseLabel('Inactive only'),
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

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListVitalRanges::route('/'),
            'create' => Pages\CreateVitalRange::route('/create'),
            'edit' => Pages\EditVitalRange::route('/{record}/edit'),
        ];
    }
}
