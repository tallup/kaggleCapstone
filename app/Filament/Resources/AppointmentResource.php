<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AppointmentResource\Pages;
use App\Filament\Resources\AppointmentResource\RelationManagers;
use App\Models\Appointment;
use App\Models\Resident;
use App\Models\Branch;
use App\Models\AppointmentType;
use App\Models\HealthcareProvider;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Actions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Auth;

class AppointmentResource extends Resource
{
    protected static ?string $model = Appointment::class;

    protected static ?string $navigationIcon = 'heroicon-o-calendar-days';
    protected static ?string $navigationLabel = 'Appointments';
    protected static ?string $modelLabel = 'Appointment';
    protected static ?string $pluralModelLabel = 'Appointments';
    protected static ?string $navigationGroup = 'Resident Care';
    protected static bool $shouldRegisterNavigation = false;

    public static function canViewAny(): bool
    {
        return auth()->user()->hasPermission('view_appointments');
    }

    public static function canCreate(): bool
    {
        return auth()->user()->hasPermission('create_appointments');
    }

    public static function canEdit($record): bool
    {
        return auth()->user()->hasPermission('edit_appointments');
    }

    public static function canDelete($record): bool
    {
        return auth()->user()->hasPermission('delete_appointments');
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        
        // If user is a caregiver, show appointments for residents in their assigned branch only
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
                Forms\Components\Section::make('Appointment Details')
                    ->schema([
                        Forms\Components\Select::make('resident_id')
                            ->label('Resident')
                            ->options(Resident::where('is_active', true)->whereNotNull('name')->pluck('name', 'id')->filter()->toArray())
                            ->searchable()
                            ->required()
                            ->live()
                            ->afterStateUpdated(function (Forms\Get $get, Forms\Set $set, $state) {
                                if ($state) {
                                    $resident = Resident::find($state);
                                    if ($resident && $resident->branch_id) {
                                        $set('branch_id', $resident->branch_id);
                                    }
                                }
                            }),
                        
                        Forms\Components\Select::make('branch_id')
                            ->label('Branch')
                            ->options(Branch::where('is_active', true)->whereNotNull('name')->pluck('name', 'id')->filter()->toArray())
                            ->searchable()
                            ->required()
                            ->disabled(fn (Forms\Get $get) => !empty($get('resident_id'))),
                        
                        Forms\Components\Select::make('appointment_type_id')
                            ->label('Appointment Type')
                            ->options(AppointmentType::active()->pluck('name', 'id')->toArray())
                            ->searchable()
                            ->required()
                            ->live(),
                        
                        Forms\Components\Select::make('healthcare_provider_id')
                            ->label('Healthcare Provider')
                            ->options(HealthcareProvider::active()->pluck('name', 'id')->toArray())
                            ->searchable()
                            ->nullable(),
                        
                        Forms\Components\TextInput::make('provider_name')
                            ->label('Custom Provider Name')
                            ->placeholder('Enter provider name if not in list above'),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Schedule & Location')
                    ->schema([
                        Forms\Components\DatePicker::make('appointment_date')
                            ->label('Appointment Date')
                            ->required()
                            ->native(false)
                            ->default(fn ($operation) => $operation === 'create' ? now() : null)
                            ->live(),
                        
                        Forms\Components\TimePicker::make('appointment_time')
                            ->label('Appointment Time')
                            ->displayFormat('g:i A')
                            ->format('H:i:s')
                            ->native(false)
                            ->seconds(false)
                            ->nullable(),
                        
                        Forms\Components\Select::make('location')
                            ->label('Location')
                            ->options([
                                'in-house' => 'In-House',
                                'external' => 'External',
                                'telehealth' => 'Telehealth',
                            ])
                            ->searchable()
                            ->nullable(),
                        
                        Forms\Components\Textarea::make('description')
                            ->label('Description')
                            ->placeholder('Appointment details, purpose, special instructions...')
                            ->rows(3),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Status & Follow-up')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'scheduled' => 'Scheduled',
                                'confirmed' => 'Confirmed',
                                'in_progress' => 'In Progress',
                                'completed' => 'Completed',
                                'cancelled' => 'Cancelled',
                                'no_show' => 'No Show',
                                'rescheduled' => 'Rescheduled',
                            ])
                            ->default('scheduled')
                            ->required(),
                        
                        Forms\Components\DatePicker::make('next_appointment_date')
                            ->label('Next Appointment Date')
                            ->native(false)
                            ->nullable(),
                        
                        Forms\Components\Select::make('recurrence_pattern')
                            ->label('Recurrence Pattern')
                            ->options([
                                'one-time' => 'One-time',
                                'daily' => 'Daily',
                                'weekly' => 'Weekly',
                                'bi-weekly' => 'Bi-weekly',
                                'monthly' => 'Monthly',
                                'custom' => 'Custom',
                            ])
                            ->nullable(),
                        
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->placeholder('Additional notes, outcomes, recommendations...')
                            ->rows(3),
                    ])
                    ->columns(2),
                
                Forms\Components\Hidden::make('created_by')
                    ->default(Auth::id()),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('branch.name')
                    ->label('Branch')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('appointment_date')
                    ->label('Date')
                    ->date('M j, Y')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('appointment_time')
                    ->label('Time')
                    ->time('g:i A')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('appointmentType.name')
                    ->label('Type')
                    ->badge()
                    ->color(fn (Appointment $record): string => $record->appointmentType->color_code ?? 'gray'),
                
                Tables\Columns\TextColumn::make('provider_name')
                    ->label('Provider')
                    ->searchable()
                    ->placeholder('N/A'),
                
                Tables\Columns\TextColumn::make('location')
                    ->label('Location')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'in-house' => 'green',
                        'external' => 'blue',
                        'telehealth' => 'purple',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'in-house' => 'In-House',
                        'external' => 'External',
                        'telehealth' => 'Telehealth',
                        default => ucfirst($state ?? 'N/A'),
                    }),
                
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (Appointment $record): string => $record->status_color),
                
                Tables\Columns\TextColumn::make('next_appointment_date')
                    ->label('Next Appointment')
                    ->date('M j, Y')
                    ->sortable()
                    ->placeholder('N/A'),
                
                Tables\Columns\TextColumn::make('description')
                    ->label('Description')
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 50 ? $state : null;
                    }),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('branch_id')
                    ->label('Branch')
                    ->options(Branch::where('is_active', true)->whereNotNull('name')->pluck('name', 'id')->filter()->toArray())
                    ->searchable(),
                
                Tables\Filters\SelectFilter::make('appointment_type_id')
                    ->label('Appointment Type')
                    ->options(AppointmentType::active()->pluck('name', 'id')->toArray())
                    ->searchable(),
                
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'scheduled' => 'Scheduled',
                        'confirmed' => 'Confirmed',
                        'in_progress' => 'In Progress',
                        'completed' => 'Completed',
                        'cancelled' => 'Cancelled',
                        'no_show' => 'No Show',
                        'rescheduled' => 'Rescheduled',
                    ]),
                
                Tables\Filters\SelectFilter::make('location')
                    ->label('Location')
                    ->options([
                        'in-house' => 'In-House',
                        'external' => 'External',
                        'telehealth' => 'Telehealth',
                    ]),
                
                Tables\Filters\Filter::make('upcoming')
                    ->label('Upcoming Appointments')
                    ->query(fn (Builder $query): Builder => $query->upcoming()),
                
                Tables\Filters\Filter::make('past')
                    ->label('Past Appointments')
                    ->query(fn (Builder $query): Builder => $query->past()),
                
                Tables\Filters\TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('mark_completed')
                    ->label('Mark Completed')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->visible(fn (Appointment $record): bool => in_array($record->status, ['scheduled', 'confirmed', 'in_progress']))
                    ->form([
                        Forms\Components\Textarea::make('notes')
                            ->label('Appointment Outcome / Notes')
                            ->placeholder('Enter notes about the appointment outcome...')
                            ->rows(4),
                    ])
                    ->action(function (Appointment $record, array $data) {
                        $updateData = ['status' => 'completed'];
                        if (!empty($data['notes'])) {
                            $existingNotes = $record->notes ? $record->notes . "\n\n" : '';
                            $updateData['notes'] = $existingNotes . "Completed on " . now()->format('Y-m-d H:i:s') . ": " . $data['notes'];
                        }
                        $record->update($updateData);
                    })
                    ->requiresConfirmation(),
                
                Tables\Actions\Action::make('cancel')
                    ->label('Cancel')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (Appointment $record): bool => in_array($record->status, ['scheduled', 'confirmed', 'in_progress']))
                    ->action(function (Appointment $record) {
                        $record->update(['status' => 'cancelled']);
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Cancel Appointment')
                    ->modalDescription('Are you sure you want to cancel this appointment? This action cannot be undone.')
                    ->modalSubmitActionLabel('Yes, Cancel Appointment'),
                
                Tables\Actions\Action::make('reschedule')
                    ->label('Reschedule')
                    ->icon('heroicon-o-calendar-days')
                    ->color('warning')
                    ->visible(fn (Appointment $record): bool => in_array($record->status, ['scheduled', 'confirmed']))
                    ->action(function (Appointment $record) {
                        $record->update(['status' => 'rescheduled']);
                    })
                    ->requiresConfirmation(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    Tables\Actions\ForceDeleteBulkAction::make(),
                    Tables\Actions\RestoreBulkAction::make(),
                ]),
            ])
            ->defaultSort('appointment_date', 'desc')
            ->poll('30s'); // Auto-refresh every 30 seconds
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
            'index' => Pages\ListAppointments::route('/'),
            'create' => Pages\CreateAppointment::route('/create'),
            'edit' => Pages\EditAppointment::route('/{record}/edit'),
        ];
    }

    public static function getHeaderActions(): array
    {
        return [
            Actions\Action::make('chart_reports')
                ->label('View Charts')
                ->icon('heroicon-o-chart-bar')
                ->color('info')
                ->url(route('filament.admin.pages.appointments-charts'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
        ];
    }
}
