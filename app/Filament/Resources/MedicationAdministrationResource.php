<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MedicationAdministrationResource\Pages;
use App\Filament\Resources\MedicationAdministrationResource\RelationManagers;
use App\Models\MedicationAdministration;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class MedicationAdministrationResource extends Resource
{
    protected static ?string $model = MedicationAdministration::class;

    protected static ?string $navigationIcon = 'heroicon-o-beaker';
    protected static ?string $navigationLabel = 'Medication Administration';
    protected static ?string $modelLabel = 'Medication Administration';
    protected static ?string $pluralModelLabel = 'Medication Administrations';
    protected static ?string $navigationGroup = 'Medications';
    protected static bool $shouldRegisterNavigation = false;

    public static function shouldRegisterNavigation(): bool
    {
        return false;
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        
        // If user is a caregiver, show medication administrations for residents in their assigned branch only
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
                Forms\Components\Section::make('Medication Administration')
                    ->description('Record when a resident took their medication')
                    ->schema([
                        Forms\Components\Select::make('branch_id')
                            ->label('Branch')
                            ->relationship('branch', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->placeholder('Choose a branch')
                            ->live(),
                        
                        Forms\Components\Select::make('resident_id')
                            ->label('Resident')
                            ->options(function (callable $get) {
                                $branchId = $get('branch_id');
                                if (!$branchId) {
                                    return [];
                                }
                                return \App\Models\Resident::where('branch_id', $branchId)
                                    ->where('is_active', true)
                                    ->pluck('name', 'id')
                                    ->filter()
                                    ->toArray();
                            })
                            ->searchable()
                            ->required()
                            ->placeholder('Choose a resident')
                            ->live(),
                        
                        Forms\Components\Select::make('medication_id')
                            ->label('Medication')
                            ->options(function (callable $get) {
                                $residentId = $get('resident_id');
                                if (!$residentId) {
                                    return [];
                                }
                                return \App\Models\Medication::where('resident_id', $residentId)
                                    ->where('is_active', true)
                                    ->pluck('name', 'id')
                                    ->filter()
                                    ->toArray();
                            })
                            ->searchable()
                            ->required()
                            ->placeholder('Choose a medication')
                            ->live()
                            ->afterStateUpdated(function ($state, callable $set) {
                                if ($state) {
                                    $medication = \App\Models\Medication::find($state);
                                    if ($medication) {
                                        $set('resident_id', $medication->resident_id);
                                        $set('branch_id', $medication->resident->branch_id);
                                    }
                                }
                            }),
                        
                        
                        Forms\Components\DateTimePicker::make('administered_at')
                            ->label('Administered At')
                            ->required()
                            ->default(fn ($operation) => $operation === 'create' ? now() : null)
                            ->displayFormat('M j, Y h:i A')
                            ->format('Y-m-d H:i:s')
                            ->minDate(now()->startOfDay())
                            ->maxDate(now()->endOfDay())
                            ->native(false)
                            ->seconds(false)
                            ->minutesStep(15)
                            ->placeholder(now()->format('M j, Y h:i A'))
                            ->disabled(function (callable $get) {
                                $medicationId = $get('medication_id');
                                if (!$medicationId) return false;
                                
                                $medication = \App\Models\Medication::find($medicationId);
                                if (!$medication) return false;
                                
                                // Calculate scheduled times for today
                                $scheduledTimes = [];
                                if ($medication->time_1) $scheduledTimes[] = $medication->time_1;
                                if ($medication->time_2) $scheduledTimes[] = $medication->time_2;
                                if ($medication->time_3) $scheduledTimes[] = $medication->time_3;
                                if ($medication->time_4) $scheduledTimes[] = $medication->time_4;
                                
                                $totalScheduled = count($scheduledTimes);
                                if ($totalScheduled === 0) return false;
                                
                                // Count completed administrations for today
                                $todayStart = now()->startOfDay();
                                $todayEnd = now()->endOfDay();
                                
                                $completedToday = \App\Models\MedicationAdministration::where('medication_id', $medicationId)
                                    ->whereBetween('administered_at', [$todayStart, $todayEnd])
                                    ->where('status', 'completed')
                                    ->count();
                                
                                return $completedToday >= $totalScheduled;
                            })
                            ->dehydrated(),
                        
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'completed' => 'Completed',
                                'missed' => 'Missed',
                                'refused' => 'Refused',
                            ])
                            ->default('completed')
                            ->required()
                            ->live()
                            ->disabled(function (callable $get) {
                                $medicationId = $get('medication_id');
                                if (!$medicationId) return false;
                                
                                $medication = \App\Models\Medication::find($medicationId);
                                if (!$medication) return false;
                                
                                // Calculate scheduled times for today
                                $scheduledTimes = [];
                                if ($medication->time_1) $scheduledTimes[] = $medication->time_1;
                                if ($medication->time_2) $scheduledTimes[] = $medication->time_2;
                                if ($medication->time_3) $scheduledTimes[] = $medication->time_3;
                                if ($medication->time_4) $scheduledTimes[] = $medication->time_4;
                                
                                $totalScheduled = count($scheduledTimes);
                                if ($totalScheduled === 0) return false;
                                
                                // Count completed administrations for today
                                $todayStart = now()->startOfDay();
                                $todayEnd = now()->endOfDay();
                                
                                $completedToday = \App\Models\MedicationAdministration::where('medication_id', $medicationId)
                                    ->whereBetween('administered_at', [$todayStart, $todayEnd])
                                    ->where('status', 'completed')
                                    ->count();
                                
                                return $completedToday >= $totalScheduled;
                            })
                            ->dehydrated(),
                        
                        Forms\Components\TextInput::make('dosage_given')
                            ->label('Dosage Given')
                            ->placeholder('e.g., 1 tablet, 2ml, 5mg')
                            ->helperText('Specify the exact dosage administered'),
                        
                        Forms\Components\Textarea::make('notes')
                            ->label('Notes')
                            ->rows(3)
                            ->placeholder('Any additional notes about the administration...'),
                        
                        Forms\Components\Placeholder::make('completion_warning')
                            ->content(function (callable $get) {
                                $medicationId = $get('medication_id');
                                if (!$medicationId) return '';
                                
                                $medication = \App\Models\Medication::find($medicationId);
                                if (!$medication) return '';
                                
                                // Calculate scheduled times for today
                                $scheduledTimes = [];
                                if ($medication->time_1) $scheduledTimes[] = $medication->time_1;
                                if ($medication->time_2) $scheduledTimes[] = $medication->time_2;
                                if ($medication->time_3) $scheduledTimes[] = $medication->time_3;
                                if ($medication->time_4) $scheduledTimes[] = $medication->time_4;
                                
                                $totalScheduled = count($scheduledTimes);
                                if ($totalScheduled === 0) return '';
                                
                                // Count completed administrations for today
                                $todayStart = now()->startOfDay();
                                $todayEnd = now()->endOfDay();
                                
                                $completedToday = \App\Models\MedicationAdministration::where('medication_id', $medicationId)
                                    ->whereBetween('administered_at', [$todayStart, $todayEnd])
                                    ->where('status', 'completed')
                                    ->count();
                                
                                if ($completedToday >= $totalScheduled) {
                                    return "⚠️ All scheduled doses for today have been completed. No further administration is needed until tomorrow.";
                                }
                                
                                return '';
                            })
                            ->visible(fn (callable $get) => $get('medication_id'))
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
                    
                    Forms\Components\Section::make('Today\'s Progress')
                        ->schema([
                            Forms\Components\Placeholder::make('progress_info')
                                ->content(function (callable $get) {
                                    $medicationId = $get('medication_id');
                                    if (!$medicationId) {
                                        return 'Select a medication to see progress';
                                    }
                                    
                                    $medication = \App\Models\Medication::find($medicationId);
                                    if (!$medication) {
                                        return 'Medication not found';
                                    }
                                    
                                    // Calculate scheduled times for today
                                    $scheduledTimes = [];
                                    if ($medication->time_1) $scheduledTimes[] = $medication->time_1;
                                    if ($medication->time_2) $scheduledTimes[] = $medication->time_2;
                                    if ($medication->time_3) $scheduledTimes[] = $medication->time_3;
                                    if ($medication->time_4) $scheduledTimes[] = $medication->time_4;
                                    
                                    $totalScheduled = count($scheduledTimes);
                                    
                                    // Count completed administrations for today
                                    $todayStart = now()->startOfDay();
                                    $todayEnd = now()->endOfDay();
                                    
                                    $completedToday = \App\Models\MedicationAdministration::where('medication_id', $medicationId)
                                        ->whereBetween('administered_at', [$todayStart, $todayEnd])
                                        ->where('status', 'completed')
                                        ->count();
                                    
                                    $progressPercentage = $totalScheduled > 0 ? round(($completedToday / $totalScheduled) * 100) : 0;
                                    
                                    $statusColor = match(true) {
                                        $completedToday === $totalScheduled && $totalScheduled > 0 => 'success',
                                        $completedToday > 0 => 'warning',
                                        default => 'danger'
                                    };
                                    
                                    $statusText = match(true) {
                                        $completedToday === $totalScheduled && $totalScheduled > 0 => 'All doses completed',
                                        $completedToday > 0 => 'Partially completed',
                                        default => 'No doses taken'
                                    };
                                    
                                    return "Progress: {$completedToday}/{$totalScheduled} doses - {$statusText}";
                                }),
                            
                            Forms\Components\Placeholder::make('progress_bar')
                                ->content(function (callable $get) {
                                    $medicationId = $get('medication_id');
                                    if (!$medicationId) return '';
                                    
                                    $medication = \App\Models\Medication::find($medicationId);
                                    if (!$medication) return '';
                                    
                                    // Calculate scheduled times for today
                                    $scheduledTimes = [];
                                    if ($medication->time_1) $scheduledTimes[] = $medication->time_1;
                                    if ($medication->time_2) $scheduledTimes[] = $medication->time_2;
                                    if ($medication->time_3) $scheduledTimes[] = $medication->time_3;
                                    if ($medication->time_4) $scheduledTimes[] = $medication->time_4;
                                    
                                    $totalScheduled = count($scheduledTimes);
                                    
                                    // Count completed administrations for today
                                    $todayStart = now()->startOfDay();
                                    $todayEnd = now()->endOfDay();
                                    
                                    $completedToday = \App\Models\MedicationAdministration::where('medication_id', $medicationId)
                                        ->whereBetween('administered_at', [$todayStart, $todayEnd])
                                        ->where('status', 'completed')
                                        ->count();
                                    
                                    $progressPercentage = $totalScheduled > 0 ? round(($completedToday / $totalScheduled) * 100) : 0;
                                    
                                    $statusColor = match(true) {
                                        $completedToday === $totalScheduled && $totalScheduled > 0 => 'success',
                                        $completedToday > 0 => 'warning',
                                        default => 'danger'
                                    };
                                    
                                    $colorClass = match($statusColor) {
                                        'success' => 'bg-green-500',
                                        'warning' => 'bg-yellow-500',
                                        'danger' => 'bg-red-500',
                                        default => 'bg-blue-500'
                                    };
                                    
                                    return "Progress: {$progressPercentage}% completed";
                                }),
                            
                            Forms\Components\Placeholder::make('scheduled_times')
                                ->content(function (callable $get) {
                                    $medicationId = $get('medication_id');
                                    if (!$medicationId) return '';
                                    
                                    $medication = \App\Models\Medication::find($medicationId);
                                    if (!$medication) return '';
                                    
                                    $scheduledTimes = [];
                                    if ($medication->time_1) $scheduledTimes[] = $medication->time_1;
                                    if ($medication->time_2) $scheduledTimes[] = $medication->time_2;
                                    if ($medication->time_3) $scheduledTimes[] = $medication->time_3;
                                    if ($medication->time_4) $scheduledTimes[] = $medication->time_4;
                                    
                                    return "Scheduled times: " . implode(', ', array_map(fn($time) => \Carbon\Carbon::parse($time)->format('g:i A'), $scheduledTimes));
                                }),
                        ])
                        ->visible(fn (callable $get) => $get('medication_id'))
                        ->columnSpanFull(),
                    
                    Forms\Components\Section::make('Recent Administrations')
                        ->schema([
                            Forms\Components\Placeholder::make('recent_info')
                                ->content(function (callable $get) {
                                    $medicationId = $get('medication_id');
                                    if (!$medicationId) {
                                        return 'Select a medication to see recent administrations';
                                    }
                                    
                                    $recentAdministrations = \App\Models\MedicationAdministration::where('medication_id', $medicationId)
                                        ->with('administeredBy')
                                        ->orderBy('administered_at', 'desc')
                                        ->limit(5)
                                        ->get();
                                    
                                    if ($recentAdministrations->isEmpty()) {
                                        return 'No administrations recorded yet';
                                    }
                                    
                                    $text = '';
                                    foreach ($recentAdministrations as $admin) {
                                        $text .= "• " . $admin->administered_at->format('M j, Y g:i A') . " - " . ucfirst($admin->status);
                                        if ($admin->administeredBy) {
                                            $text .= " (by " . $admin->administeredBy->name . ")";
                                        }
                                        $text .= "\n";
                                    }
                                    
                                    return $text;
                                }),
                        ])
                            ->visible(fn (callable $get) => $get('medication_id'))
                            ->columnSpanFull(),
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
                
                Tables\Columns\TextColumn::make('medication.name')
                    ->label('Medication')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                
                Tables\Columns\TextColumn::make('administered_at')
                    ->label('Administered At')
                    ->dateTime('M j, Y h:i A')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'taken' => 'success',
                        'missed' => 'danger',
                        'refused' => 'warning',
                        default => 'gray',
                    }),
                
                Tables\Columns\TextColumn::make('dosage_given')
                    ->label('Dosage')
                    ->searchable(),
                
                Tables\Columns\TextColumn::make('administeredBy.name')
                    ->label('Administered By')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('notes')
                    ->label('Notes')
                    ->limit(30)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 30 ? $state : null;
                    }),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'taken' => 'Taken',
                        'missed' => 'Missed',
                        'refused' => 'Refused',
                    ]),
                Tables\Filters\SelectFilter::make('resident_id')
                    ->label('Resident')
                    ->relationship('resident', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('medication_id')
                    ->label('Medication')
                    ->relationship('medication', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\Filter::make('administered_at')
                    ->form([
                        Forms\Components\DatePicker::make('administered_from')
                            ->label('From Date'),
                        Forms\Components\DatePicker::make('administered_until')
                            ->label('Until Date'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['administered_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('administered_at', '>=', $date),
                            )
                            ->when(
                                $data['administered_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('administered_at', '<=', $date),
                            );
                    }),
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
            ->defaultSort('administered_at', 'desc');
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
            'index' => Pages\ListMedicationAdministrations::route('/'),
            'create' => \App\Filament\Resources\MedicationAdministrationResource\Pages\CreateMedicationAdministration::route('/create'),
            'edit' => Pages\EditMedicationAdministration::route('/{record}/edit'),
        ];
    }
}
