<?php

namespace App\Filament\Pages;

use App\Models\CleaningArea;
use App\Models\CleaningTask;
use App\Models\CleaningTaskLog;
use Carbon\Carbon;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Pages\Page;
use Filament\Support\Enums\MaxWidth;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Collection;

class HousekeepingDashboard extends Page implements Forms\Contracts\HasForms
{
    use Forms\Concerns\InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-sparkles';
    protected static ?string $navigationGroup = 'Operations';
    protected static ?string $title = 'Housekeeping Dashboard';
    protected static bool $shouldRegisterNavigation = false;
    protected static string $view = 'filament.pages.housekeeping-dashboard';
    protected static ?int $navigationSort = 68;

    public ?string $selectedDate = null;
    public ?int $branchId = null;

    public array $filters = [
        'area_id' => null,
        'status' => null,
        'shift' => null,
    ];

    public array $summary = [];
    public Collection $rows;

    public function mount(): void
    {
        $this->selectedDate = now()->toDateString();
        $this->branchId = auth()->user()->assigned_branch_id;
        $this->loadData();
    }

    public function loadData(): void
    {
        $date = Carbon::parse($this->selectedDate ?? now());

        $areasQuery = CleaningArea::query()
            ->where('branch_id', $this->branchId)
            ->where('is_active', true)
            ->with(['tasks' => fn ($query) => $query->where('is_active', true)->orderBy('display_order')]);

        if ($this->filters['area_id']) {
            $areasQuery->where('id', $this->filters['area_id']);
        }

        $areas = $areasQuery->orderBy('display_order')->get();
        $taskIds = $areas->flatMap(fn (CleaningArea $area) => $area->tasks->pluck('id'))->all();

        $logs = CleaningTaskLog::query()
            ->whereIn('cleaning_task_id', $taskIds)
            ->whereDate('scheduled_date', $date->toDateString())
            ->get()
            ->keyBy('cleaning_task_id');

        $rows = collect();
        $summary = [
            'total' => 0,
            'completed' => 0,
            'skipped' => 0,
            'pending' => 0,
            'required_missing' => 0,
        ];

        foreach ($areas as $area) {
            foreach ($area->tasks as $task) {
                if (!$task->isScheduledForDate($date)) {
                    continue;
                }

                $summary['total']++;

                $log = $logs->get($task->id);
                $status = $log?->status ?? 'pending';

                match ($status) {
                    'completed' => $summary['completed']++,
                    'skipped' => $summary['skipped']++,
                    default => $summary['pending']++,
                };

                if ($status !== 'completed' && $task->is_required) {
                    $summary['required_missing']++;
                }

                $rows->push([
                    'area' => $area->name,
                    'shift' => $area->shift_label ?? 'N/A',
                    'task' => $task->title,
                    'required' => $task->is_required,
                    'status' => $status,
                    'initials' => $log?->initials,
                    'notes' => $log?->notes,
                    'completed_at' => optional($log?->completed_at)->format('g:i a'),
                ]);
            }
        }

        $this->rows = $rows;
        $this->summary = $summary;
    }

    protected function getForms(): array
    {
        return [
            'filterForm',
        ];
    }

    public function filterForm(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\DatePicker::make('selectedDate')
                    ->label('Date')
                    ->default($this->selectedDate ?? now())
                    ->closeOnDateSelection()
                    ->live(debounce: 500),
                Forms\Components\Select::make('branchId')
                    ->label('Branch')
                    ->relationship('branch', 'name')
                    ->default(auth()->user()->assigned_branch_id)
                    ->disabled(fn (): bool => !auth()->user()->hasPermission('view_branches')),
                Forms\Components\Select::make('filters.area_id')
                    ->label('Cleaning Area')
                    ->relationship('tasks.area', 'name')
                    ->searchable()
                    ->preload(),
                Forms\Components\Select::make('filters.status')
                    ->label('Status')
                    ->options([
                        'pending' => 'Pending',
                        'completed' => 'Completed',
                        'skipped' => 'Skipped',
                    ])
                    ->placeholder('Any'),
                Forms\Components\Select::make('filters.shift')
                    ->label('Shift')
                    ->options(
                        CleaningArea::query()
                            ->distinct()
                            ->pluck('shift_label', 'shift_label')
                            ->filter()
                            ->toArray()
                    )
                    ->placeholder('Any'),
            ])
            ->statePath('filters')
            ->columns(2);
    }

    public function getMaxContentWidth(): MaxWidth
    {
        return MaxWidth::Full;
    }

    public function updated($propertyName): void
    {
        if (in_array($propertyName, ['selectedDate', 'branchId', 'filters.area_id', 'filters.status', 'filters.shift'])) {
            $this->loadData();
        }
    }
}
