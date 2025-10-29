<?php

namespace App\Filament\Widgets;

use Filament\Widgets\TableWidget as BaseWidget;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use App\Models\Branch;
use App\Models\Assessment;

class SystemHealthWidget extends BaseWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?string $heading = 'System Health';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Branch::withCount([
                    'residents',
                    'residents as active_residents_count' => function ($query) {
                        $query->where('is_active', true);
                    }
                ])
                ->where('is_active', true)
            )
            ->columns([
                TextColumn::make('name')
                    ->label('Branch')
                    ->searchable()
                    ->sortable(),
                
                TextColumn::make('residents_count')
                    ->label('Total Residents')
                    ->numeric(),
                
                TextColumn::make('active_residents_count')
                    ->label('Active Residents')
                    ->numeric()
                    ->color('success'),
                
                TextColumn::make('assessments_count')
                    ->label('Total Assessments')
                    ->formatStateUsing(function ($record) {
                        return Assessment::whereHas('resident', function($query) use ($record) {
                            $query->where('branch_id', $record->id);
                        })->count();
                    })
                    ->numeric(),
                
                TextColumn::make('completed_assessments_count')
                    ->label('Completed')
                    ->formatStateUsing(function ($record) {
                        return Assessment::whereHas('resident', function($query) use ($record) {
                            $query->where('branch_id', $record->id);
                        })->where('status', 'approved')->count();
                    })
                    ->numeric()
                    ->color('success'),
            ]);
    }
}








