<?php

namespace App\Filament\Widgets;

use Filament\Widgets\TableWidget as BaseWidget;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Actions\Action;
use App\Models\Resident;

class AdminResidentsWidget extends BaseWidget
{
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 1,
    ];
    protected static ?string $heading = 'Active Residents';
    protected static ?int $sort = 8;

    protected static ?string $pollingInterval = '45s';
    
    public function table(Table $table): Table
    {
        return $table
            ->query(
                Resident::with(['branch', 'vitalSigns'])
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->limit(10)
            )
            ->searchable()
            ->defaultSort('name')
            ->columns([
                TextColumn::make('name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable()
                    ->icon('heroicon-o-user')
                    ->iconColor('primary')
                    ->weight('medium'),
                
                TextColumn::make('branch.name')
                    ->label('Branch')
                    ->badge()
                    ->color('success'),
                
                TextColumn::make('room')
                    ->label('Room')
                    ->icon('heroicon-o-home')
                    ->placeholder('Not assigned'),
                
                TextColumn::make('admission_date')
                    ->label('Admitted')
                    ->date('M j, Y')
                    ->sortable(),
                
                TextColumn::make('last_vitals')
                    ->label('Last Vitals')
                    ->getStateUsing(function ($record) {
                        $lastVital = $record->vitalSigns()->latest('measurement_date')->first();
                        return $lastVital ? $lastVital->measurement_date->format('M j, Y') : 'No vitals';
                    })
                    ->badge()
                    ->color(function ($record) {
                        $lastVital = $record->vitalSigns()->latest('measurement_date')->first();
                        if (!$lastVital) return 'gray';
                        $daysSince = $lastVital->measurement_date->diffInDays(now());
                        return $daysSince > 3 ? 'danger' : ($daysSince > 1 ? 'warning' : 'success');
                    }),
            ])
            ->actions([
                Action::make('view')
                    ->label('View')
                    ->icon('heroicon-o-eye')
                    ->color('info')
                    ->url(fn (Resident $record): string => route('filament.admin.resources.residents.edit', $record)),
            ])
            ->emptyStateHeading('No Active Residents')
            ->emptyStateDescription('Active residents will appear here.')
            ->emptyStateIcon('heroicon-o-users');
    }
}

