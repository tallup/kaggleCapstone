<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VitalSignResource\Pages;
use App\Filament\Resources\VitalSignResource\RelationManagers;
use App\Models\VitalSign;
use App\Models\Resident;
use App\Models\Branch;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Actions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Auth;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\Filter;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Hidden;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Actions\Action;
use Filament\Tables\Actions\BulkActionGroup;
use Filament\Tables\Actions\DeleteBulkAction;
use Filament\Tables\Actions\ForceDeleteBulkAction;
use Filament\Tables\Actions\RestoreBulkAction;
use Filament\Tables\Filters\TrashedFilter;

class VitalSignResource extends Resource
{
    protected static ?string $model = VitalSign::class;

    protected static ?string $navigationIcon = 'heroicon-o-heart';
    protected static ?string $navigationLabel = 'Vitals';
    protected static ?int $navigationSort = 55;
    protected static ?string $modelLabel = 'Vital Sign';
    protected static ?string $pluralModelLabel = 'Vital Signs';
    protected static ?string $navigationGroup = 'Resident Care';
    protected static bool $shouldRegisterNavigation = false;

    public static function canViewAny(): bool
    {
        return auth()->user()->hasPermission('view_vital_signs');
    }

    public static function canCreate(): bool
    {
        return auth()->user()->hasPermission('create_vital_signs');
    }

    public static function canEdit($record): bool
    {
        return auth()->user()->hasPermission('edit_vital_signs');
    }

    public static function canDelete($record): bool
    {
        return auth()->user()->hasPermission('delete_vital_signs');
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Resident Information')
                    ->schema([
                        Select::make('resident_id')
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
                        
                        Select::make('branch_id')
                            ->label('Branch')
                            ->options(Branch::where('is_active', true)->whereNotNull('name')->pluck('name', 'id')->filter()->toArray())
                            ->searchable()
                            ->required()
                            ->disabled(fn (Forms\Get $get) => !empty($get('resident_id')))
                            ->live()
                            ->rules(['required', 'exists:branches,id']),
                        
                        DatePicker::make('measurement_date')
                            ->label('Measurement Date')
                            ->required()
                            ->native(false)
                            ->default(fn ($operation) => $operation === 'create' ? now() : null)
                            ->displayFormat('m/d/Y'),
                    ])
                    ->columns(3),

                Section::make('Vital Signs Measurements')
                    ->schema([
                        TextInput::make('systolic')
                            ->label('Systolic (mmHg)')
                            ->numeric()
                            ->placeholder('120')
                            ->helperText('Upper number of blood pressure'),
                        
                        TextInput::make('diastolic')
                            ->label('Diastolic (mmHg)')
                            ->numeric()
                            ->placeholder('80')
                            ->helperText('Lower number of blood pressure'),
                        
                        TextInput::make('temperature')
                            ->label('Temperature (°F)')
                            ->numeric()
                            ->step(0.1)
                            ->placeholder('98.6')
                            ->helperText('Body temperature in Fahrenheit'),
                        
                        TextInput::make('pulse')
                            ->label('Pulse (BPM)')
                            ->numeric()
                            ->placeholder('72')
                            ->helperText('Heart rate in beats per minute'),
                        
                        TextInput::make('oxygen_saturation')
                            ->label('Oxygen Saturation (%)')
                            ->numeric()
                            ->placeholder('98')
                            ->helperText('SpO2 percentage'),
                        
                        TextInput::make('pain_level')
                            ->label('Pain Level (0-10)')
                            ->numeric()
                            ->minValue(0)
                            ->maxValue(10)
                            ->placeholder('0')
                            ->helperText('Pain scale from 0 (no pain) to 10 (severe pain)'),
                        
                        Textarea::make('pain_description')
                            ->label('Pain Description')
                            ->placeholder('Describe the pain if applicable')
                            ->rows(2),
                    ])
                    ->columns(3),

                Section::make('Status & Documentation')
                    ->schema([
                        Select::make('status')
                            ->label('Status')
                            ->options([
                                'approved' => 'Approved',
                                'pending_review' => 'Pending Review',
                                'declined' => 'Declined',
                                'critical' => 'Critical',
                            ])
                            ->default('pending_review')
                            ->required(),
                        
                        Textarea::make('reason_declined')
                            ->label('Reason Declined')
                            ->placeholder('Reason if vital signs could not be obtained')
                            ->rows(2),
                        
                        Textarea::make('notes')
                            ->label('Notes')
                            ->placeholder('Additional notes about the vital signs')
                            ->rows(3),
                        
                        Hidden::make('taken_by')
                            ->default(Auth::id()),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable(),
                
                TextColumn::make('branch.name')
                    ->label('Branch')
                    ->searchable()
                    ->sortable(),
                
                TextColumn::make('formatted_date')
                    ->label('Date')
                    ->sortable('measurement_date'),
                
                TextColumn::make('blood_pressure')
                    ->label('Blood Pressure')
                    ->getStateUsing(fn ($record) => $record->blood_pressure ?: 'N/A'),
                
                TextColumn::make('formatted_temperature')
                    ->label('Temperature')
                    ->getStateUsing(fn ($record) => $record->formatted_temperature ?: 'N/A'),
                
                TextColumn::make('formatted_pulse')
                    ->label('Pulse')
                    ->getStateUsing(fn ($record) => $record->formatted_pulse ?: 'N/A'),
                
                TextColumn::make('formatted_oxygen_saturation')
                    ->label('Oxygen Saturation')
                    ->getStateUsing(fn ($record) => $record->formatted_oxygen_saturation ?: 'N/A'),
                
                TextColumn::make('pain_level')
                    ->label('Pain Level')
                    ->getStateUsing(fn ($record) => $record->pain_level ? $record->pain_level . '/10' : 'N/A'),
                
                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'success' => 'approved',
                        'warning' => 'pending_review',
                        'gray' => 'declined',
                        'danger' => 'critical',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'approved' => 'Approved',
                        'pending_review' => 'Pending Review',
                        'declined' => 'Declined',
                        'critical' => 'Critical',
                        default => $state,
                    }),
                
                TextColumn::make('takenBy.name')
                    ->label('Taken By')
                    ->searchable(),
                
                TextColumn::make('created_at')
                    ->label('Created')
                    ->dateTime('m/d/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('branch_id')
                    ->label('Branch')
                    ->options(Branch::where('is_active', true)->pluck('name', 'id')->toArray())
                    ->searchable(),
                
                SelectFilter::make('resident_id')
                    ->label('Resident')
                    ->options(Resident::where('is_active', true)->pluck('name', 'id')->toArray())
                    ->searchable(),
                
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'approved' => 'Approved',
                        'pending_review' => 'Pending Review',
                        'declined' => 'Declined',
                        'critical' => 'Critical',
                    ]),
                
                Filter::make('measurement_date')
                    ->form([
                        DatePicker::make('from')
                            ->label('From Date'),
                        DatePicker::make('until')
                            ->label('Until Date'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('measurement_date', '>=', $date),
                            )
                            ->when(
                                $data['until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('measurement_date', '<=', $date),
                            );
                    }),
                
                Filter::make('critical')
                    ->label('Critical Readings')
                    ->query(fn (Builder $query): Builder => $query->where('status', 'critical')),
                
                Filter::make('pending_review')
                    ->label('Pending Review')
                    ->query(fn (Builder $query): Builder => $query->where('status', 'pending_review')),
                
                TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Action::make('approve')
                    ->label('Approve')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->action(function (VitalSign $record) {
                        $record->update(['status' => 'approved']);
                    })
                    ->visible(fn (VitalSign $record): bool => $record->status === 'pending_review'),
                
                Action::make('mark_critical')
                    ->label('Mark Critical')
                    ->icon('heroicon-o-exclamation-triangle')
                    ->color('danger')
                    ->action(function (VitalSign $record) {
                        $record->update(['status' => 'critical']);
                    })
                    ->visible(fn (VitalSign $record): bool => in_array($record->status, ['pending_review', 'approved'])),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                    ForceDeleteBulkAction::make(),
                    RestoreBulkAction::make(),
                ]),
            ])
            ->defaultSort('measurement_date', 'desc')
            ->poll('30s');
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
            'index' => Pages\ListVitalSigns::route('/'),
            'create' => Pages\CreateVitalSign::route('/create'),
            'view' => Pages\ViewVitalSign::route('/{record}'),
            'edit' => Pages\EditVitalSign::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
        
        // If user is a caregiver, show vital signs for residents in their assigned branch only
        if (auth()->user()->hasRole('caregiver')) {
            $query->whereHas('resident', function ($q) {
                $q->where('branch_id', auth()->user()->assigned_branch_id);
            });
        }
        
        return $query;
    }

    public static function getHeaderActions(): array
    {
        return [
            Actions\Action::make('chart_reports')
                ->label('View Charts')
                ->icon('heroicon-o-chart-bar')
                ->color('info')
                ->url(route('filament.admin.pages.vitals-charts'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
            Actions\Action::make('vitals_reports')
                ->label('View Reports')
                ->icon('heroicon-o-document-text')
                ->color('success')
                ->url(route('filament.admin.pages.vitals-reports'))
                ->visible(fn() => auth()->user()->hasRole('administrator') || auth()->user()->hasRole('super_admin')),
        ];
    }
}
