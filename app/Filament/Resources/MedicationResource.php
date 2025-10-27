<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MedicationResource\Pages;
use App\Filament\Resources\MedicationResource\RelationManagers;
use App\Models\Medication;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Actions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class MedicationResource extends Resource
{
    protected static ?string $model = Medication::class;

    protected static ?string $navigationIcon = 'heroicon-o-cube';
    protected static ?string $navigationLabel = 'Medications';
    protected static ?string $modelLabel = 'Medication';
    protected static ?string $pluralModelLabel = 'Medications';
    protected static ?string $navigationGroup = 'Resident Care';
    protected static ?int $navigationSort = 45;
    protected static bool $shouldRegisterNavigation = false;

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        
        // If user is a caregiver, show medications for residents in their assigned branch only
        if (auth()->user()->hasRole('caregiver')) {
            $query->whereHas('resident', function ($q) {
                $q->where('branch_id', auth()->user()->assigned_branch_id);
            });
        }
        
        return $query;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Medication Information')
                    ->schema([
                        Forms\Components\Select::make('branch_id')
                            ->label('Select Branch')
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
                            ->label('Select Resident')
                            ->options(function (callable $get) {
                                $branchId = $get('branch_id');
                                if (!$branchId) {
                                    return [];
                                }
                                return \App\Models\Resident::where('branch_id', $branchId)
                                    ->where('is_active', true)
                                    ->pluck('name', 'id')
                                    ->toArray();
                            })
                            ->searchable()
                            ->required()
                            ->placeholder('Choose a resident')
                            ->disabled(fn (callable $get) => !$get('branch_id'))
                            ->helperText('Please select a branch first')
                            ->live()
                            ->afterStateUpdated(function ($state, callable $set) {
                                if ($state) {
                                    $resident = \App\Models\Resident::find($state);
                                    if ($resident && $resident->branch_id) {
                                        $set('branch_id', $resident->branch_id);
                                    }
                                }
                            }),
                        Forms\Components\TextInput::make('name')
                            ->label('Medication Name')
                            ->placeholder('Enter medication name (e.g., Metformin, Lisinopril)')
                            ->required()
                            ->maxLength(255),
                        
                        Forms\Components\Select::make('drug_id')
                            ->label('Select Drug/Medicine')
                            ->relationship('drug', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->placeholder('Choose a drug/medicine')
                            ->getOptionLabelFromRecordUsing(fn ($record) => $record->display_name)
                            ->createOptionForm([
                                Forms\Components\TextInput::make('name')
                                    ->label('Drug Name')
                                    ->required()
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('generic_name')
                                    ->label('Generic Name')
                                    ->maxLength(255),
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
                                    ]),
                                Forms\Components\TextInput::make('strength')
                                    ->label('Strength')
                                    ->placeholder('e.g., 500mg, 10ml')
                                    ->maxLength(255),
                            ])
                            ->createOptionUsing(function (array $data): int {
                                return \App\Models\Drug::create($data)->getKey();
                            }),
                        Forms\Components\Select::make('instructions')
                            ->label('Select Instructions')
                            ->options(Medication::getInstructionOptions())
                            ->searchable()
                            ->required()
                            ->live()
                            ->placeholder('Choose dosage instructions'),
                        
                        // Dynamic time fields based on instruction
                        Forms\Components\Section::make('Medication Times')
                            ->schema([
                                Forms\Components\TimePicker::make('time_1')
                                    ->label('Time 1')
                                    ->native(false)
                                    ->displayFormat('g:i A')
                                    ->format('H:i:s')
                                    ->suffixIcon('heroicon-o-clock')
                                    ->suffixIconColor('primary')
                                    ->placeholder('Click to select time')
                                    ->seconds(false)
                                    ->minutesStep(15)
                                    ->extraInputAttributes(['readonly' => true])
                                    ->visible(fn (Forms\Get $get) => in_array($get('instructions'), ['t.i.d', 'q.i.d', 'b.i.d', 'a.m', 'p.m']))
                                    ->required(fn (Forms\Get $get) => in_array($get('instructions'), ['t.i.d', 'q.i.d', 'b.i.d', 'a.m', 'p.m'])),
                                
                                Forms\Components\TimePicker::make('time_2')
                                    ->label('Time 2')
                                    ->native(false)
                                    ->displayFormat('g:i A')
                                    ->format('H:i:s')
                                    ->suffixIcon('heroicon-o-clock')
                                    ->suffixIconColor('primary')
                                    ->placeholder('Click to select time')
                                    ->seconds(false)
                                    ->minutesStep(15)
                                    ->extraInputAttributes(['readonly' => true])
                                    ->visible(fn (Forms\Get $get) => in_array($get('instructions'), ['t.i.d', 'q.i.d', 'b.i.d']))
                                    ->required(fn (Forms\Get $get) => in_array($get('instructions'), ['t.i.d', 'q.i.d', 'b.i.d'])),
                                
                                Forms\Components\TimePicker::make('time_3')
                                    ->label('Time 3')
                                    ->native(false)
                                    ->displayFormat('g:i A')
                                    ->format('H:i:s')
                                    ->suffixIcon('heroicon-o-clock')
                                    ->suffixIconColor('primary')
                                    ->placeholder('Click to select time')
                                    ->seconds(false)
                                    ->minutesStep(15)
                                    ->extraInputAttributes(['readonly' => true])
                                    ->visible(fn (Forms\Get $get) => in_array($get('instructions'), ['t.i.d', 'q.i.d']))
                                    ->required(fn (Forms\Get $get) => in_array($get('instructions'), ['t.i.d', 'q.i.d'])),
                                
                                Forms\Components\TimePicker::make('time_4')
                                    ->label('Time 4')
                                    ->native(false)
                                    ->displayFormat('g:i A')
                                    ->format('H:i:s')
                                    ->suffixIcon('heroicon-o-clock')
                                    ->suffixIconColor('primary')
                                    ->placeholder('Click to select time')
                                    ->seconds(false)
                                    ->minutesStep(15)
                                    ->extraInputAttributes(['readonly' => true])
                                    ->visible(fn (Forms\Get $get) => $get('instructions') === 'q.i.d')
                                    ->required(fn (Forms\Get $get) => $get('instructions') === 'q.i.d'),
                            ])
                            ->columns(2)
                            ->visible(fn (Forms\Get $get) => in_array($get('instructions'), ['t.i.d', 'q.i.d', 'b.i.d', 'a.m', 'p.m'])),
                        
                        Forms\Components\TextInput::make('quantity')
                            ->label('Quantity')
                            ->numeric()
                            ->required()
                            ->placeholder('Enter quantity (e.g., 30, 100)')
                            ->helperText('Number of pills, tablets, or dosage units'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Medical Information')
                    ->schema([
                        Forms\Components\Textarea::make('diagnosis')
                            ->label('Diagnosis (Optional)')
                            ->rows(3)
                            ->placeholder('Enter the medical condition or diagnosis...'),
                        Forms\Components\DatePicker::make('prescription_date')
                            ->label('Prescription Date')
                            ->displayFormat('M j, Y')
                            ->default(now())
                            ->required(),
                        Forms\Components\DatePicker::make('start_date')
                            ->label('Start Date')
                            ->displayFormat('M j, Y')
                            ->default(now()),
                        Forms\Components\DatePicker::make('end_date')
                            ->label('End Date')
                            ->displayFormat('M j, Y')
                            ->after('start_date'),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Additional Information')
                    ->schema([
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->placeholder('Any additional notes about this medication...'),
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active Medication')
                            ->default(true)
                            ->helperText('Enable this medication for administration'),
                    ])
                    ->columns(1),
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
                Tables\Columns\TextColumn::make('drug.name')
                    ->label('Medication')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->placeholder('No drug selected'),
                Tables\Columns\TextColumn::make('instructions')
                    ->label('Instructions')
                    ->formatStateUsing(fn (string $state): string => Medication::getInstructionOptions()[$state] ?? $state)
                    ->badge()
                    ->color('primary'),
                Tables\Columns\TextColumn::make('medication_times')
                    ->label('Times')
                    ->formatStateUsing(function ($record) {
                        $times = [];
                        if ($record->time_1) $times[] = \Carbon\Carbon::parse($record->time_1)->format('g:i A');
                        if ($record->time_2) $times[] = \Carbon\Carbon::parse($record->time_2)->format('g:i A');
                        if ($record->time_3) $times[] = \Carbon\Carbon::parse($record->time_3)->format('g:i A');
                        if ($record->time_4) $times[] = \Carbon\Carbon::parse($record->time_4)->format('g:i A');
                        return implode(', ', $times);
                    })
                    ->limit(30)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 30 ? $state : null;
                    })
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('quantity')
                    ->label('Quantity')
                    ->sortable()
                    ->badge()
                    ->color('success'),
                Tables\Columns\TextColumn::make('diagnosis')
                    ->label('Diagnosis')
                    ->limit(30)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 30 ? $state : null;
                    }),
                Tables\Columns\TextColumn::make('prescription_date')
                    ->label('Prescribed')
                    ->date('M j, Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('start_date')
                    ->label('Start Date')
                    ->date('M j, Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('end_date')
                    ->label('End Date')
                    ->date('M j, Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Status')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('danger'),
                Tables\Columns\TextColumn::make('createdBy.name')
                    ->label('Created By')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Status')
                    ->placeholder('All medications')
                    ->trueLabel('Active medications')
                    ->falseLabel('Inactive medications'),
                Tables\Filters\SelectFilter::make('resident_id')
                    ->label('Resident')
                    ->relationship('resident', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('instructions')
                    ->label('Instructions')
                    ->options(Medication::getInstructionOptions()),
                Tables\Filters\Filter::make('prescription_date')
                    ->form([
                        Forms\Components\DatePicker::make('prescribed_from')
                            ->label('Prescribed From'),
                        Forms\Components\DatePicker::make('prescribed_until')
                            ->label('Prescribed Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['prescribed_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('prescription_date', '>=', $date),
                            )
                            ->when(
                                $data['prescribed_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('prescription_date', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('administer')
                    ->label('Administer')
                    ->icon('heroicon-o-calendar-days')
                    ->color('success')
                    ->visible(fn ($record) => $record->is_active)
                    ->url(fn ($record) => \App\Filament\Resources\MedicationAdministrationResource::getUrl('create', ['medication' => $record->id]))
                    ->openUrlInNewTab(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('prescription_date', 'desc');
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
            'index' => Pages\ListMedications::route('/'),
            'create' => Pages\CreateMedication::route('/create'),
            'view' => Pages\ViewMedication::route('/{record}'),
            'edit' => Pages\EditMedication::route('/{record}/edit'),
        ];
    }

    public static function getHeaderActions(): array
    {
        return [
            Actions\Action::make('medication_reports')
                ->label('View Reports')
                ->icon('heroicon-o-document-text')
                ->color('info')
                ->url(route('filament.admin.pages.medication-reports'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
        ];
    }
}
