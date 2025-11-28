<?php

namespace App\Filament\Widgets;

use Filament\Widgets\TableWidget as BaseWidget;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Actions\Action;
use App\Models\Appointment;

class AdminUpcomingAppointmentsWidget extends BaseWidget
{
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 1,
    ];
    protected static ?string $heading = 'Upcoming Appointments';
    protected static ?int $sort = 7;
    protected static ?string $pollingInterval = '60s';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Appointment::with(['resident', 'branch', 'appointmentType'])
                    ->whereDate('appointment_date', '>=', today())
                    ->whereNotIn('status', ['cancelled', 'completed'])
                    ->orderBy('appointment_date')
                    ->orderBy('appointment_time')
                    ->limit(10)
            )
            ->searchable()
            ->defaultSort('appointment_date')
            ->columns([
                TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable()
                    ->icon('heroicon-o-user')
                    ->iconColor('primary'),
                
                TextColumn::make('branch.name')
                    ->label('Branch')
                    ->badge()
                    ->color('success'),
                
                TextColumn::make('appointmentType.name')
                    ->label('Type')
                    ->badge()
                    ->color(fn ($record) => $record->appointmentType?->color_code ?? 'gray'),
                
                TextColumn::make('appointment_date')
                    ->label('Date')
                    ->date('M j, Y')
                    ->sortable()
                    ->icon('heroicon-o-calendar')
                    ->iconColor('warning'),
                
                TextColumn::make('appointment_time')
                    ->label('Time')
                    ->time('g:i A')
                    ->placeholder('Anytime')
                    ->icon('heroicon-o-clock'),
                
                TextColumn::make('provider_name')
                    ->label('Provider')
                    ->limit(20)
                    ->placeholder('Not specified'),
                
                TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'scheduled' => 'warning',
                        'confirmed' => 'info',
                        'in_progress' => 'primary',
                        default => 'gray',
                    }),
            ])
            ->actions([
                Action::make('view')
                    ->label('View')
                    ->icon('heroicon-o-eye')
                    ->color('info')
                    ->url(fn (Appointment $record): string => route('filament.admin.resources.appointments.edit', $record)),
            ])
            ->emptyStateHeading('No Upcoming Appointments')
            ->emptyStateDescription('All upcoming appointments will appear here.')
            ->emptyStateIcon('heroicon-o-calendar-days');
    }
}

