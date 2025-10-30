<?php

namespace App\Filament\Pages;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use Carbon\Carbon;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Form;
use Filament\Pages\Page;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Illuminate\Database\Eloquent\Builder;

class MedicationCalendar extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-calendar-days';
    protected static string $view = 'filament.pages.medication-calendar';
    protected static ?string $navigationLabel = 'Medication Calendar';
    protected static ?string $title = 'Medication Administration Calendar';
    protected static ?string $navigationGroup = 'Medications';
    protected static ?int $navigationSort = 1;

    public static function shouldRegisterNavigation(): bool
    {
        return false; // hide from navigation
    }

    public ?string $selectedDate = null;
    public ?int $selectedResident = null;
    public ?int $selectedMedication = null;
    public ?string $administeredAt = null;
    public ?string $status = 'completed';
    public ?string $dosageGiven = null;
    public ?string $notes = null;

    public function mount(): void
    {
        $this->selectedDate = now()->format('Y-m-d');
        if (request()->has('medication')) {
            $medication = Medication::find(request('medication'));
            if ($medication && $medication->resident) {
                $this->selectedResident = $medication->resident_id;
                $this->selectedDate = now()->format('Y-m-d');
            }
        }
    }

    public function getViewData(): array
    {
        $date = Carbon::parse($this->selectedDate);
        $startOfDay = $date->copy()->startOfDay();
        $endOfDay = $date->copy()->endOfDay();
        $medications = Medication::with(['resident', 'drug', 'administrations' => function ($query) use ($startOfDay, $endOfDay) {
            $query->whereBetween('administered_at', [$startOfDay, $endOfDay])
                  ->orderBy('administered_at', 'desc');
        }])
        ->where('is_active', true)
        ->where(function ($query) use ($date) {
            $query->where('start_date', '<=', $date)
                  ->where(function ($q) use ($date) {
                      $q->whereNull('end_date')
                        ->orWhere('end_date', '>=', $date);
                  });
        });
        if (auth()->user()->hasRole('caregiver')) {
            $medications->whereHas('resident', function ($q) {
                $q->where('branch_id', auth()->user()->assigned_branch_id);
            });
        }
        if ($this->selectedResident) {
            $medications->where('resident_id', $this->selectedResident);
        }
        $medications = $medications->get();
        $calendarData = $this->getCalendarData($date);
        return [
            'medications' => $medications,
            'calendarData' => $calendarData,
            'selectedDate' => $this->selectedDate,
            'residents' => $this->getResidents(),
            'medicationOptions' => $this->getMedicationOptions(),
        ];
    }

    public function getMedicationsProperty()
    {
        return $this->getViewData()['medications'];
    }

    public function getCalendarDataProperty()
    {
        return $this->getViewData()['calendarData'];
    }

    protected function getCalendarData(Carbon $date): array
    {
        $startOfMonth = $date->copy()->startOfMonth()->startOfWeek();
        $endOfMonth = $date->copy()->endOfMonth()->endOfWeek();
        $calendar = [];
        $current = $startOfMonth->copy();
        while ($current->lte($endOfMonth)) {
            $dayData = [
                'date' => $current->format('Y-m-d'),
                'day' => $current->day,
                'isCurrentMonth' => $current->month === $date->month,
                'isToday' => $current->isToday(),
                'isSelected' => $current->format('Y-m-d') === $this->selectedDate,
                'medicationCount' => 0,
                'completedCount' => 0,
            ];
            $dayStart = $current->copy()->startOfDay();
            $dayEnd = $current->copy()->endOfDay();
            $medications = Medication::where('is_active', true)
                ->where(function ($query) use ($dayStart) {
                    $query->where('start_date', '<=', $dayStart)
                          ->where(function ($q) use ($dayStart) {
                              $q->whereNull('end_date')
                                ->orWhere('end_date', '>=', $dayStart);
                          });
                });
            if (auth()->user()->hasRole('caregiver')) {
                $medications->whereHas('resident', function ($q) {
                    $q->where('branch_id', auth()->user()->assigned_branch_id);
                });
            }
            if ($this->selectedResident) {
                $medications->where('resident_id', $this->selectedResident);
            }
            $dayMedications = $medications->get();
            $dayData['medicationCount'] = $dayMedications->count();
            $completedCount = MedicationAdministration::whereIn('medication_id', $dayMedications->pluck('id'))
                ->whereBetween('administered_at', [$dayStart, $dayEnd])
                ->where('status', 'completed')
                ->count();
            $expectedDoses = 0;
            foreach ($dayMedications as $medication) {
                $times = [];
                if ($medication->time_1) $times[] = $medication->time_1;
                if ($medication->time_2) $times[] = $medication->time_2;
                if ($medication->time_3) $times[] = $medication->time_3;
                if ($medication->time_4) $times[] = $medication->time_4;
                $expectedDoses += count($times);
            }
            $dayData['completedCount'] = $completedCount;
            $dayData['expectedDoses'] = $expectedDoses;
            $calendar[] = $dayData;
            $current->addDay();
        }
        return $calendar;
    }

    protected function getResidents(): array
    {
        $query = Resident::where('is_active', true)->whereNotNull('name');
        if (auth()->user()->hasRole('caregiver')) {
            $query->where('branch_id', auth()->user()->assigned_branch_id);
        }
        return $query->pluck('name', 'id')->toArray();
    }

    protected function getMedicationOptions(): array
    {
        if (!$this->selectedResident) {
            return [];
        }
        return Medication::where('resident_id', $this->selectedResident)
            ->where('is_active', true)
            ->with('drug')
            ->get()
            ->mapWithKeys(function ($medication) {
                return [$medication->id => $medication->name . ' (' . ($medication->drug->strength ?? 'N/A') . ')'];
            })
            ->toArray();
    }

    public function selectDate(string $date): void
    {
        $this->selectedDate = $date;
        $this->reset(['selectedResident', 'selectedMedication', 'administeredAt', 'status', 'dosageGiven', 'notes']);
    }

    public function selectResident(int $residentId): void
    {
        $this->selectedResident = $residentId;
        $this->selectedMedication = null;
    }

    public function selectMedication(int $medicationId): void
    {
        $this->selectedMedication = $medicationId;
    }

    public function clearResidentFilter(): void
    {
        $this->selectedResident = null;
    }

    public function saveAdministration(): void
    {
        $this->validate([
            'selectedResident' => 'required|exists:residents,id',
            'selectedMedication' => 'required|exists:medications,id',
            'administeredAt' => 'required|date',
            'status' => 'required|in:completed,missed,refused',
            'dosageGiven' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);
        $medication = Medication::findOrFail($this->selectedMedication);
        MedicationAdministration::create([
            'medication_id' => $this->selectedMedication,
            'resident_id' => $medication->resident_id,
            'branch_id' => $medication->branch_id,
            'administered_at' => $this->administeredAt,
            'status' => $this->status,
            'dosage_given' => $this->dosageGiven,
            'notes' => $this->notes,
            'administered_by' => auth()->id(),
        ]);
        Notification::make()->title('Medication Administration Recorded')->success()->send();
        $this->reset(['selectedResident', 'selectedMedication', 'administeredAt', 'status', 'dosageGiven', 'notes']);
    }

    public function quickAdminister(int $medicationId, string $status = 'completed'): void
    {
        $medication = Medication::findOrFail($medicationId);
        $existingAdmin = MedicationAdministration::where('medication_id', $medicationId)
            ->whereDate('administered_at', now()->toDateString())
            ->first();
        if ($existingAdmin) {
            $existingAdmin->update([
                'status' => $status,
                'administered_at' => now(),
                'administered_by' => auth()->id(),
            ]);
        } else {
            MedicationAdministration::create([
                'medication_id' => $medicationId,
                'resident_id' => $medication->resident_id,
                'branch_id' => $medication->branch_id,
                'administered_at' => now(),
                'status' => $status,
                'administered_by' => auth()->id(),
            ]);
        }
        Notification::make()->title('Medication ' . ucfirst($status))->success()->send();
        $this->dispatch('$refresh');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('open_medication_management')
                ->label('Medication Management')
                ->icon('heroicon-o-cube')
                ->color('primary')
                ->url(route('filament.admin.pages.medication-management')),
        ];
    }
}
