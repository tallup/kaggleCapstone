<?php

namespace App\Filament\Resources;

use App\Filament\Resources\DrugResource\Pages;
use App\Filament\Resources\DrugResource\RelationManagers;
use App\Models\Drug;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class DrugResource extends Resource
{
    protected static ?string $model = Drug::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';
    protected static ?string $navigationLabel = 'Drugs';
    protected static ?string $modelLabel = 'Drug';
    protected static ?string $pluralModelLabel = 'Drugs';
    protected static ?string $navigationGroup = 'Medications';

    public static function shouldRegisterNavigation(): bool
    {
        return false;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Drug Information')
                    ->description('Add a new drug/medicine to the system')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Drug Name')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->placeholder('e.g., Paracetamol, Aspirin')
                            ->maxLength(255),
                        
                        Forms\Components\TextInput::make('generic_name')
                            ->label('Generic Name')
                            ->placeholder('e.g., Acetaminophen')
                            ->maxLength(255),
                        
                        Forms\Components\Textarea::make('description')
                            ->label('Description')
                            ->rows(3)
                            ->placeholder('Brief description of the drug...'),
                        
                        Forms\Components\Select::make('dosage_form')
                            ->label('Dosage Form')
                            ->options([
                                'tablet' => 'Tablet',
                                'capsule' => 'Capsule',
                                'liquid' => 'Liquid',
                                'injection' => 'Injection',
                                'cream' => 'Cream',
                                'ointment' => 'Ointment',
                                'drops' => 'Drops',
                                'patch' => 'Patch',
                                'inhaler' => 'Inhaler',
                                'suppository' => 'Suppository',
                            ])
                            ->searchable()
                            ->placeholder('Select dosage form'),
                        
                        Forms\Components\TextInput::make('strength')
                            ->label('Strength')
                            ->placeholder('e.g., 500mg, 10ml, 2.5mg')
                            ->maxLength(255),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Medical Information')
                    ->description('Medical details and safety information')
                    ->schema([
                        Forms\Components\Textarea::make('indications')
                            ->label('Indications')
                            ->rows(3)
                            ->placeholder('What this drug is used for...'),
                        
                        Forms\Components\Textarea::make('contraindications')
                            ->label('Contraindications')
                            ->rows(3)
                            ->placeholder('When this drug should not be used...'),
                        
                        Forms\Components\Textarea::make('side_effects')
                            ->label('Side Effects')
                            ->rows(3)
                            ->placeholder('Common side effects...'),
                        
                        Forms\Components\Textarea::make('storage_instructions')
                            ->label('Storage Instructions')
                            ->rows(2)
                            ->placeholder('How to store this medication...'),
                    ])
                    ->columns(1),
                
                Forms\Components\Section::make('Status')
                    ->schema([
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active')
                            ->default(true)
                            ->helperText('Inactive drugs will not appear in medication dropdowns'),
                    ])
                    ->columns(1),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Drug Name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                
                Tables\Columns\TextColumn::make('generic_name')
                    ->label('Generic Name')
                    ->searchable()
                    ->sortable()
                    ->placeholder('N/A'),
                
                Tables\Columns\TextColumn::make('strength')
                    ->label('Strength')
                    ->searchable()
                    ->placeholder('N/A'),
                
                Tables\Columns\TextColumn::make('dosage_form')
                    ->label('Form')
                    ->badge()
                    ->color('primary'),
                
                Tables\Columns\TextColumn::make('indications')
                    ->label('Indications')
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 50 ? $state : null;
                    }),
                
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Active')
                    ->boolean()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('medications_count')
                    ->label('Used In')
                    ->counts('medications')
                    ->badge()
                    ->color('success'),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('dosage_form')
                    ->options([
                        'tablet' => 'Tablet',
                        'capsule' => 'Capsule',
                        'liquid' => 'Liquid',
                        'injection' => 'Injection',
                        'cream' => 'Cream',
                        'ointment' => 'Ointment',
                        'drops' => 'Drops',
                        'patch' => 'Patch',
                        'inhaler' => 'Inhaler',
                        'suppository' => 'Suppository',
                    ]),
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Active Status')
                    ->boolean()
                    ->trueLabel('Active only')
                    ->falseLabel('Inactive only')
                    ->native(false),
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
            ->defaultSort('name', 'asc');
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
            'index' => Pages\ListDrugs::route('/'),
            'create' => Pages\CreateDrug::route('/create'),
            'edit' => Pages\EditDrug::route('/{record}/edit'),
        ];
    }
}
