<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MedicationDeliveryResource\Pages;
use App\Filament\Resources\MedicationDeliveryResource\RelationManagers;
use App\Models\MedicationDelivery;
use App\Models\Branch;
use App\Models\Resident;
use App\Models\Medication;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Auth;

class MedicationDeliveryResource extends Resource
{
    protected static ?string $model = MedicationDelivery::class;

    protected static ?string $navigationIcon = 'heroicon-o-truck';
    protected static ?string $navigationLabel = 'Medication Deliveries';
    protected static ?string $modelLabel = 'Medication Delivery';
    protected static ?string $pluralModelLabel = 'Medication Deliveries';
    protected static ?string $navigationGroup = 'Medications';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Delivery Information')
                    ->schema([
                        Forms\Components\Select::make('branch_id')
                            ->label('Branch')
                            ->relationship('branch', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->live()
                            ->afterStateUpdated(function (Forms\Set $set) {
                                $set('resident_id', null);
                                $set('medication_id', null);
                            }),
                        Forms\Components\Select::make('delivery_type')
                            ->label('Delivery Type')
                            ->options([
                                'individual' => 'Individual Medication',
                                'batch' => 'Batch Delivery',
                            ])
                            ->default('individual')
                            ->required()
                            ->live(),
                        Forms\Components\Select::make('resident_id')
                            ->label('Resident')
                            ->relationship('resident', 'name', fn ($query, Forms\Get $get) => 
                                $query->where('branch_id', $get('branch_id'))
                            )
                            ->searchable()
                            ->preload()
                            ->visible(fn (Forms\Get $get) => $get('delivery_type') === 'individual')
                            ->nullable(),
                        Forms\Components\Select::make('medication_id')
                            ->label('Medication')
                            ->relationship('medication', 'name', fn ($query, Forms\Get $get) => 
                                $query->where('branch_id', $get('branch_id'))
                                    ->when($get('resident_id'), fn ($q, $residentId) => 
                                        $q->where('resident_id', $residentId)
                                    )
                            )
                            ->searchable()
                            ->preload()
                            ->required(fn (Forms\Get $get) => $get('delivery_type') === 'individual')
                            ->visible(fn (Forms\Get $get) => $get('delivery_type') === 'individual')
                            ->nullable(),
                        Forms\Components\TextInput::make('pharmacy_name')
                            ->label('Pharmacy Name')
                            ->maxLength(255),
                        Forms\Components\TextInput::make('quantity_received')
                            ->label('Quantity Received')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('e.g., 30 tablets, 2 bottles'),
                        Forms\Components\DatePicker::make('received_date')
                            ->label('Received Date')
                            ->required()
                            ->native(false)
                            ->displayFormat('M j, Y')
                            ->default(now()),
                        Forms\Components\TimePicker::make('received_time')
                            ->label('Received Time')
                            ->required()
                            ->native(false)
                            ->seconds(false)
                            ->default(now()),
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'received' => 'Received',
                                'verified' => 'Verified',
                                'stored' => 'Stored',
                            ])
                            ->default('received')
                            ->required(),
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->placeholder('Enter any additional notes...')
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('branch.name')
                    ->label('Branch')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('delivery_type')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'individual' => 'info',
                        'batch' => 'warning',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => ucfirst($state)),
                Tables\Columns\TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable()
                    ->placeholder('N/A')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('medication.name')
                    ->label('Medication')
                    ->searchable()
                    ->sortable()
                    ->placeholder('N/A')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('pharmacy_name')
                    ->label('Pharmacy')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('quantity_received')
                    ->label('Quantity')
                    ->searchable(),
                Tables\Columns\TextColumn::make('received_date')
                    ->label('Received Date')
                    ->date('M j, Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('received_time')
                    ->label('Received Time')
                    ->time('g:i A')
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'received' => 'warning',
                        'verified' => 'info',
                        'stored' => 'success',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => ucfirst($state)),
                Tables\Columns\TextColumn::make('receivedBy.name')
                    ->label('Received By')
                    ->searchable()
                    ->sortable(),
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
                Tables\Filters\SelectFilter::make('delivery_type')
                    ->options([
                        'individual' => 'Individual',
                        'batch' => 'Batch',
                    ]),
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'received' => 'Received',
                        'verified' => 'Verified',
                        'stored' => 'Stored',
                    ]),
                Tables\Filters\Filter::make('received_date')
                    ->form([
                        Forms\Components\DatePicker::make('received_from')
                            ->label('From Date'),
                        Forms\Components\DatePicker::make('received_until')
                            ->label('Until Date'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['received_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('received_date', '>=', $date),
                            )
                            ->when(
                                $data['received_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('received_date', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('received_date', 'desc');
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
            'index' => Pages\ListMedicationDeliveries::route('/'),
            'create' => Pages\CreateMedicationDelivery::route('/create'),
            'edit' => Pages\EditMedicationDelivery::route('/{record}/edit'),
        ];
    }
}
