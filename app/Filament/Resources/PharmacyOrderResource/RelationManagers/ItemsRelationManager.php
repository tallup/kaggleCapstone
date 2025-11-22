<?php

namespace App\Filament\Resources\PharmacyOrderResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class ItemsRelationManager extends RelationManager
{
    protected static string $relationship = 'items';

    protected static ?string $title = 'Order Items';

    public function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('drug_id')
                ->label('Drug')
                ->relationship('drug', 'name')
                ->searchable()
                ->preload()
                ->required()
                ->createOptionForm([
                    Forms\Components\TextInput::make('name')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('generic_name')
                        ->maxLength(255),
                    Forms\Components\Select::make('dosage_form')
                        ->options([
                            'tablet' => 'Tablet',
                            'capsule' => 'Capsule',
                            'liquid' => 'Liquid',
                            'injection' => 'Injection',
                            'cream' => 'Cream',
                            'ointment' => 'Ointment',
                        ]),
                    Forms\Components\TextInput::make('strength')
                        ->maxLength(255),
                ])
                ->live()
                ->afterStateUpdated(function ($state, callable $set) {
                    // You could auto-populate unit cost from inventory if available
                    if ($state && $drug = \App\Models\Drug::find($state)) {
                        // Try to get cost from inventory for this branch
                        $ownerRecord = $this->getOwnerRecord();
                        if ($ownerRecord && $ownerRecord->branch_id) {
                            $inventory = \App\Models\PharmacyInventory::where('branch_id', $ownerRecord->branch_id)
                                ->where('drug_id', $state)
                                ->first();
                            if ($inventory && $inventory->unit_cost) {
                                $set('unit_cost', $inventory->unit_cost);
                            }
                        }
                    }
                }),
            
            Forms\Components\TextInput::make('quantity_ordered')
                ->label('Quantity Ordered')
                ->numeric()
                ->required()
                ->default(1)
                ->minValue(1)
                ->live()
                ->afterStateUpdated(function ($state, callable $get, callable $set) {
                    // Recalculate line total
                    $quantity = $state ?? 0;
                    $unitCost = $get('unit_cost') ?? 0;
                    $discount = $get('discount') ?? 0;
                    $subtotal = $quantity * $unitCost;
                    $discountAmount = $subtotal * ($discount / 100);
                    $set('line_total', $subtotal - $discountAmount);
                }),
            
            Forms\Components\TextInput::make('unit_cost')
                ->label('Unit Cost ($)')
                ->numeric()
                ->required()
                ->step(0.01)
                ->minValue(0)
                ->prefix('$')
                ->live()
                ->afterStateUpdated(function ($state, callable $get, callable $set) {
                    // Recalculate line total
                    $quantity = $get('quantity_ordered') ?? 0;
                    $unitCost = $state ?? 0;
                    $discount = $get('discount') ?? 0;
                    $subtotal = $quantity * $unitCost;
                    $discountAmount = $subtotal * ($discount / 100);
                    $set('line_total', $subtotal - $discountAmount);
                }),
            
            Forms\Components\TextInput::make('discount')
                ->label('Discount (%)')
                ->numeric()
                ->default(0)
                ->step(0.01)
                ->minValue(0)
                ->maxValue(100)
                ->suffix('%')
                ->live()
                ->afterStateUpdated(function ($state, callable $get, callable $set) {
                    // Recalculate line total
                    $quantity = $get('quantity_ordered') ?? 0;
                    $unitCost = $get('unit_cost') ?? 0;
                    $discount = $state ?? 0;
                    $subtotal = $quantity * $unitCost;
                    $discountAmount = $subtotal * ($discount / 100);
                    $set('line_total', $subtotal - $discountAmount);
                })
                ->helperText('Discount percentage'),
            
            Forms\Components\TextInput::make('quantity_received')
                ->label('Quantity Received')
                ->numeric()
                ->default(0)
                ->minValue(0)
                ->helperText('Amount received from supplier')
                ->disabled(fn ($record) => $record && !in_array($this->getOwnerRecord()->status, ['received', 'partially_received', 'confirmed'])),
            
            Forms\Components\TextInput::make('line_total')
                ->label('Line Total ($)')
                ->numeric()
                ->disabled()
                ->dehydrated()
                ->prefix('$')
                ->helperText('Calculated automatically'),
            
            Forms\Components\Textarea::make('notes')
                ->label('Notes')
                ->rows(2)
                ->columnSpanFull()
                ->placeholder('Additional notes for this item...'),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('drug.name')
            ->columns([
                Tables\Columns\TextColumn::make('drug.name')
                    ->label('Drug Name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                
                Tables\Columns\TextColumn::make('drug.strength')
                    ->label('Strength')
                    ->placeholder('N/A'),
                
                Tables\Columns\TextColumn::make('quantity_ordered')
                    ->label('Ordered')
                    ->sortable()
                    ->alignEnd(),
                
                Tables\Columns\TextColumn::make('quantity_received')
                    ->label('Received')
                    ->sortable()
                    ->alignEnd()
                    ->formatStateUsing(function ($state, $record) {
                        if ($record->quantity_received >= $record->quantity_ordered) {
                            return $state . ' ✓';
                        } elseif ($record->quantity_received > 0) {
                            return $state . ' ⚠';
                        }
                        return $state ?? '0';
                    })
                    ->color(fn ($record) => match (true) {
                        $record->quantity_received >= $record->quantity_ordered => 'success',
                        $record->quantity_received > 0 => 'warning',
                        default => 'gray',
                    }),
                
                Tables\Columns\TextColumn::make('unit_cost')
                    ->label('Unit Cost')
                    ->money('USD')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('discount')
                    ->label('Discount')
                    ->formatStateUsing(fn ($state) => $state ? number_format($state, 2) . '%' : '0%')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('line_total')
                    ->label('Line Total')
                    ->money('USD')
                    ->sortable()
                    ->weight('bold'),
                
                Tables\Columns\TextColumn::make('notes')
                    ->label('Notes')
                    ->limit(30)
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->mutateFormDataUsing(function (array $data): array {
                        // Set default discount from supplier if available
                        $ownerRecord = $this->getOwnerRecord();
                        if ($ownerRecord && $ownerRecord->supplier && $ownerRecord->supplier->default_discount) {
                            $data['discount'] = $ownerRecord->supplier->default_discount;
                        }
                        return $data;
                    })
                    ->after(function ($record) {
                        // Recalculate order totals
                        $this->recalculateOrderTotals();
                    }),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->after(function ($record) {
                        // Recalculate order totals
                        $this->recalculateOrderTotals();
                    }),
                Tables\Actions\DeleteAction::make()
                    ->after(function () {
                        // Recalculate order totals
                        $this->recalculateOrderTotals();
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->after(function () {
                            // Recalculate order totals
                            $this->recalculateOrderTotals();
                        }),
                ]),
            ])
            ->defaultSort('id');
    }

    protected function recalculateOrderTotals(): void
    {
        $order = $this->getOwnerRecord();
        if ($order) {
            $order->calculateTotal();
            $order->save();
        }
    }
}





