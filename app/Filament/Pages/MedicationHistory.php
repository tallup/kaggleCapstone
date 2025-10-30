<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Filament\Tables\Table;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Forms\Components\DatePicker;
use Illuminate\Database\Eloquent\Builder;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Filament\Widgets\SimpleMedicationStatsWidget;
use Carbon\Carbon;
use Filament\Actions; 

class MedicationHistory extends Page implements HasTable
{
    use InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-cube';
    protected static ?string $navigationLabel = 'Medication History';
    protected static ?string $title = 'Medication History';
    protected static ?string $navigationGroup = 'Reports';
    protected static ?int $navigationSort = 3;
    protected static string $view = 'filament.pages.medication-history';
    protected static bool $shouldRegisterNavigation = false;

    public ?int $selectedResident = null;

    public function mount(): void
    {
        // Set default resident if provided in URL
        if (request()->has('resident')) {
            $this->selectedResident = request('resident');
        }
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(
                MedicationAdministration::query()
                    ->with(['medication', 'resident', 'administeredBy'])
                    ->when($this->selectedResident, function (Builder $query) {
                        $query->where('resident_id', $this->selectedResident);
                    })
                    ->when(auth()->user()->hasRole('caregiver'), function (Builder $query) {
                        $query->whereHas('resident', function ($q) {
                            $q->where('branch_id', auth()->user()->assigned_branch_id);
                        });
                    })
                    ->orderBy('administered_at', 'desc')
            )
            ->columns([
                TextColumn::make('resident.name')
                    ->label('Resident')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->icon('heroicon-o-user')
                    ->iconColor('primary'),
                
                TextColumn::make('medication.name')
                    ->label('Medication')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->icon('heroicon-o-cube')
                    ->iconColor('success'),
                
                TextColumn::make('administered_at')
                    ->label('Date & Time')
                    ->dateTime('M j, Y g:i A')
                    ->sortable()
                    ->searchable()
                    ->icon('heroicon-o-clock')
                    ->iconColor('gray')
                    ->description(fn ($record) => $record->administered_at->diffForHumans()),
                
                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'success' => 'completed',
                        'warning' => 'missed',
                        'danger' => 'refused',
                    ])
                    ->formatStateUsing(fn (string $state): string => match($state) {
                        'completed' => 'Completed',
                        'missed' => 'Missed',
                        'refused' => 'Refused',
                        default => ucfirst($state),
                    })
                    ->icons([
                        'heroicon-o-check-circle' => 'completed',
                        'heroicon-o-clock' => 'missed',
                        'heroicon-o-x-circle' => 'refused',
                    ]),
                
                TextColumn::make('dosage_given')
                    ->label('Dosage')
                    ->searchable()
                    ->placeholder('Not specified')
                    ->icon('heroicon-o-scale')
                    ->iconColor('gray'),
                
                TextColumn::make('administeredBy.name')
                    ->label('Administered By')
                    ->searchable()
                    ->sortable()
                    ->icon('heroicon-o-user-circle')
                    ->iconColor('primary')
                    ->placeholder('Unknown'),
                
                TextColumn::make('notes')
                    ->label('Notes')
                    ->searchable()
                    ->limit(50)
                    ->placeholder('No notes')
                    ->icon('heroicon-o-document-text')
                    ->iconColor('gray'),
            ])
            ->filters([
                SelectFilter::make('resident_id')
                    ->label('Resident')
                    ->options(function () {
                        $query = Resident::query();
                        
                        if (auth()->user()->hasRole('caregiver')) {
                            $query->where('branch_id', auth()->user()->assigned_branch_id);
                        }
                        
                        return $query->pluck('name', 'id')->toArray();
                    })
                    ->searchable()
                    ->preload(),
                
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'completed' => 'Completed',
                        'missed' => 'Missed',
                        'refused' => 'Refused',
                    ]),
                
                SelectFilter::make('date_range')
                    ->label('Date Range')
                    ->form([
                        DatePicker::make('start_date')
                            ->label('Start Date')
                            ->default(now()->subDays(30)),
                        DatePicker::make('end_date')
                            ->label('End Date')
                            ->default(now()),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['start_date'],
                                fn (Builder $query, $date): Builder => $query->whereDate('administered_at', '>=', $date),
                            )
                            ->when(
                                $data['end_date'],
                                fn (Builder $query, $date): Builder => $query->whereDate('administered_at', '<=', $date),
                            );
                    }),
            ])
            ->defaultSort('administered_at', 'desc')
            ->paginated([10, 25, 50, 100]);
    }

    protected function getViewData(): array
    {
        $resident = null;
        if ($this->selectedResident) {
            $resident = Resident::find($this->selectedResident);
        }

        return [
            'resident' => $resident,
        ];
    }

    public static function canAccess(): bool
    {
        return auth()->check();
    }

    public static function shouldRegisterNavigation(): bool
    {
        return auth()->check();
    }

    protected function getHeaderWidgets(): array
    {
        // The widget reads the resident from the request; no custom configuration needed
        return [
            SimpleMedicationStatsWidget::class,
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('open_medication_management')
                ->label('Medication Management')
                ->icon('heroicon-o-cube')
                ->color('primary')
                ->url(route('filament.admin.pages.medication-management')),
        ];
    }
}
