<?php

namespace App\Filament\Resources\CleaningTaskResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class AssignmentsRelationManager extends RelationManager
{
    protected static string $relationship = 'assignments';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\DatePicker::make('scheduled_date')
                    ->label('Scheduled Date')
                    ->required()
                    ->closeOnDateSelection(),
                Forms\Components\Select::make('user_id')
                    ->label('Assigned Caregiver')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->required(),
                Forms\Components\Select::make('status')
                    ->options([
                        'assigned' => 'Assigned',
                        'acknowledged' => 'Acknowledged',
                        'completed' => 'Completed',
                        'overdue' => 'Overdue',
                    ])
                    ->default('assigned')
                    ->required(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('scheduled_date')
            ->columns([
                Tables\Columns\TextColumn::make('scheduled_date')
                    ->label('Date')
                    ->date(),
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Caregiver')
                    ->searchable(),
                Tables\Columns\BadgeColumn::make('status')
                    ->enum([
                        'assigned' => 'Assigned',
                        'acknowledged' => 'Acknowledged',
                        'completed' => 'Completed',
                        'overdue' => 'Overdue',
                    ])
                    ->colors([
                        'gray' => 'assigned',
                        'info' => 'acknowledged',
                        'success' => 'completed',
                        'danger' => 'overdue',
                    ]),
                Tables\Columns\TextColumn::make('notified_at')
                    ->label('Notified')
                    ->dateTime()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('acknowledged_at')
                    ->label('Acknowledged')
                    ->dateTime()
                    ->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'assigned' => 'Assigned',
                        'acknowledged' => 'Acknowledged',
                        'completed' => 'Completed',
                        'overdue' => 'Overdue',
                    ]),
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ])
            ->defaultSort('scheduled_date', 'desc');
    }
}




