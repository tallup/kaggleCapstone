<?php

namespace App\Services;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class MedicationLogReportService
{
    private const SLOT_TOLERANCE_SECONDS = 7200;

    /**
     * Build view data for the medication log PDF.
     *
     * @return array<string, mixed>
     */
    public function buildViewData(Resident $resident, Carbon $dateFrom, Carbon $dateTo): array
    {
        $tz = config('app.timezone');
        $dateFrom = $dateFrom->copy()->timezone($tz)->startOfDay();
        $dateTo = $dateTo->copy()->timezone($tz)->endOfDay();

        $resident->load(['branch.facility']);

        $medications = Medication::query()
            ->where('resident_id', $resident->id)
            ->with(['drug'])
            ->orderBy('name')
            ->get();

        $administrations = MedicationAdministration::query()
            ->where('resident_id', $resident->id)
            ->where('administered_at', '>=', $dateFrom)
            ->where('administered_at', '<=', $dateTo)
            ->with(['administeredBy'])
            ->get();

        $byMedication = $administrations->groupBy('medication_id');

        $days = [];
        $cursor = $dateFrom->copy()->startOfDay();
        $endDay = $dateTo->copy()->startOfDay();
        while ($cursor->lte($endDay)) {
            $days[] = [
                'dom' => (int) $cursor->format('j'),
                'short' => $cursor->format('M j'),
                'date' => $cursor->toDateString(),
            ];
            $cursor->addDay();
        }

        $scheduledSections = [];
        $prnSections = [];

        foreach ($medications as $medication) {
            if ($this->isPrnMedication($medication)) {
                $prnSections[] = $this->buildPrnSection($medication, $byMedication->get($medication->id, collect()));
                continue;
            }

            $section = $this->buildScheduledSection($medication, $byMedication->get($medication->id, collect()), $days, $dateFrom, $dateTo);
            if ($section !== null) {
                $scheduledSections[] = $section;
            }
        }

        $facility = $resident->branch?->facility;
        $branch = $resident->branch;

        return [
            'facilityName' => $facility?->name ?? $branch?->name ?? 'Facility',
            'facilityAddress' => $facility?->address ?? $branch?->address,
            'facilityPhone' => $facility?->phone ?? $branch?->phone,
            'branchName' => $branch?->name,
            'residentName' => trim(implode(' ', array_filter([
                $resident->first_name,
                $resident->middle_names,
                $resident->last_name,
            ]))) ?: ($resident->name ?? 'Resident'),
            'residentDob' => $resident->date_of_birth
                ? $resident->date_of_birth->format('F j, Y')
                : '',
            'physician' => $resident->physician_name ?: $resident->primary_care_doctor ?: $resident->pep_or_doctor,
            'diagnosis' => $this->formatDiagnosis($resident, $medications),
            'allergies' => $this->formatAllergies($resident),
            'diet' => $resident->dietary_restrictions ?: '—',
            'rangeLabel' => $dateFrom->format('M d, Y').' - '.$dateTo->format('M d, Y'),
            'exportedAt' => Carbon::now($tz)->format('M d, Y g:i A T'),
            'days' => $days,
            'scheduledSections' => $scheduledSections,
            'prnSections' => array_values(array_filter($prnSections)),
        ];
    }

    private function isPrnMedication(Medication $medication): bool
    {
        $ins = trim((string) ($medication->instructions ?? ''));

        return strcasecmp($ins, 'PRN') === 0;
    }

    /**
     * @param  Collection<int, MedicationAdministration>  $medAdmins
     */
    private function buildScheduledSection(Medication $medication, Collection $medAdmins, array $days, Carbon $rangeStart, Carbon $rangeEnd): ?array
    {
        $slots = [];
        foreach (['time_1', 'time_2', 'time_3', 'time_4'] as $key) {
            $t = $medication->{$key} ?? null;
            if ($t) {
                $slots[] = ['field' => $key, 'time_raw' => $t];
            }
        }

        if ($slots === []) {
            return null;
        }

        $drug = $medication->drug;
        $drugName = $drug?->name ?: $medication->name;
        $strength = $drug?->strength;
        $form = $drug?->dosage_form;

        $rows = [];
        foreach ($slots as $slot) {
            $cells = [];
            foreach ($days as $day) {
                $dateKey = $day['date'];
                $dayCarbon = Carbon::parse($dateKey, config('app.timezone'))->startOfDay();
                if (! $this->isMedicationActiveOnDate($medication, $dayCarbon)) {
                    $cells[$dateKey] = '—';

                    continue;
                }

                $slotTime = $this->combineDateAndTime($dayCarbon, $slot['time_raw']);
                if (! $slotTime) {
                    $cells[$dateKey] = '—';

                    continue;
                }

                $cells[$dateKey] = $this->resolveCellContent(
                    $medication,
                    $medAdmins,
                    $slotTime,
                    $dayCarbon
                );
            }

            $rows[] = [
                'time_label' => $this->formatTimeLabel($slot['time_raw']),
                'cells' => $cells,
            ];
        }

        return [
            'title' => strtoupper($drugName),
            'strength' => $strength ? 'Strength: '.$strength : null,
            'form_line' => $form ? 'Form: '.$form : null,
            'start_date' => $medication->start_date
                ? 'Start: '.$medication->start_date->format('F j, Y')
                : null,
            'quantity' => $medication->quantity ? 'Qty. '.$medication->quantity : null,
            'instructions' => $medication->instructions,
            'instruction_display' => $medication->instructions ? $medication->instruction_display : null,
            'sig' => $medication->notes,
            'diagnosis' => $medication->diagnosis,
            'rows' => $rows,
        ];
    }

    /**
     * @param  Collection<int, MedicationAdministration>  $medAdmins
     */
    private function buildPrnSection(Medication $medication, Collection $medAdmins): array
    {
        $drug = $medication->drug;
        $drugName = $drug?->name ?: $medication->name;

        $sorted = $medAdmins->sortBy('administered_at')->values();
        $rows = [];

        foreach ($sorted as $admin) {
            $rows[] = [
                'date' => $admin->administered_at->timezone(config('app.timezone'))->format('M j, Y'),
                'time' => $admin->administered_at->timezone(config('app.timezone'))->format('g:i A'),
                'initials' => $this->cellDisplayForAdministration($admin),
                'notes' => $admin->notes,
                'status' => $admin->status,
            ];
        }

        return [
            'title' => strtoupper($drugName),
            'strength' => $drug?->strength,
            'quantity' => $medication->quantity,
            'instructions' => $medication->instructions,
            'sig' => $medication->notes,
            'rows' => $rows,
        ];
    }

    private function resolveCellContent(
        Medication $medication,
        Collection $medAdmins,
        Carbon $slotTime,
        Carbon $dayStart
    ): string {
        $dayEnd = $dayStart->copy()->endOfDay();

        $candidates = $medAdmins->filter(function (MedicationAdministration $a) use ($medication, $dayStart, $dayEnd) {
            if ((int) $a->medication_id !== (int) $medication->id) {
                return false;
            }
            $at = $a->administered_at->copy()->timezone(config('app.timezone'));

            return $at->between($dayStart, $dayEnd);
        });

        if ($candidates->isEmpty()) {
            return '—';
        }

        $best = null;
        $bestDiff = PHP_INT_MAX;

        foreach ($candidates as $a) {
            $at = $a->administered_at->copy()->timezone(config('app.timezone'));
            $diff = abs($at->diffInSeconds($slotTime));
            if ($diff < $bestDiff && $diff <= self::SLOT_TOLERANCE_SECONDS) {
                $bestDiff = $diff;
                $best = $a;
            }
        }

        if ($best === null) {
            $best = $candidates->sortBy(function (MedicationAdministration $a) use ($slotTime) {
                $at = $a->administered_at->copy()->timezone(config('app.timezone'));

                return abs($at->diffInSeconds($slotTime));
            })->first();
        }

        return $this->cellDisplayForAdministration($best);
    }

    private function cellDisplayForAdministration(MedicationAdministration $admin): string
    {
        return match ($admin->status) {
            'completed' => $this->userInitials($admin->administeredBy) ?: '✓',
            'missed' => 'M',
            'refused' => 'R',
            'hospital_admission' => 'H+',
            'pharmacy_administration_confirm' => 'Rx',
            default => strtoupper(substr((string) $admin->status, 0, 3)),
        };
    }

    private function userInitials(?User $user): string
    {
        if (! $user) {
            return '';
        }
        $first = trim((string) ($user->first_name ?? ''));
        $last = trim((string) ($user->last_name ?? ''));
        if ($first !== '' || $last !== '') {
            return strtoupper(substr($first, 0, 1).substr($last, 0, 1));
        }
        $name = trim((string) ($user->name ?? ''));
        if ($name === '') {
            return '';
        }
        $parts = preg_split('/\s+/', $name);

        if (count($parts) >= 2) {
            return strtoupper(substr($parts[0], 0, 1).substr($parts[count($parts) - 1], 0, 1));
        }

        return strtoupper(substr($name, 0, 2));
    }

    private function combineDateAndTime(Carbon $date, ?string $timeStr): ?Carbon
    {
        if (! $timeStr) {
            return null;
        }
        $timeStr = trim($timeStr);
        if (strlen($timeStr) === 5 && $timeStr[2] === ':') {
            $timeStr .= ':00';
        }

        try {
            return Carbon::parse($date->format('Y-m-d').' '.$timeStr, config('app.timezone'));
        } catch (\Throwable) {
            return null;
        }
    }

    private function formatTimeLabel(?string $timeRaw): string
    {
        if (! $timeRaw) {
            return '';
        }
        $timeStr = trim($timeRaw);
        if (strlen($timeStr) === 5 && $timeStr[2] === ':') {
            $timeStr .= ':00';
        }
        try {
            return Carbon::parse('2000-01-01 '.$timeStr, config('app.timezone'))->format('g:i A');
        } catch (\Throwable) {
            return (string) $timeRaw;
        }
    }

    private function isMedicationActiveOnDate(Medication $medication, Carbon $day): bool
    {
        if (! $medication->is_active) {
            return false;
        }
        if ($medication->start_date) {
            $start = Carbon::parse($medication->start_date)->startOfDay();
            if ($day->lt($start)) {
                return false;
            }
        }
        if ($medication->end_date) {
            $end = Carbon::parse($medication->end_date)->endOfDay();
            if ($day->gt($end)) {
                return false;
            }
        }

        return true;
    }

    private function formatDiagnosis(Resident $resident, Collection $medications): string
    {
        $parts = [];
        if ($resident->diagnosis) {
            $parts[] = $resident->diagnosis;
        }
        foreach ($medications as $m) {
            if ($m->diagnosis) {
                $parts[] = $m->diagnosis;
            }
        }
        $parts = array_unique(array_filter(array_map('trim', $parts)));

        return $parts !== [] ? implode(', ', $parts) : '—';
    }

    private function formatAllergies(Resident $resident): string
    {
        $a = $resident->allergies;
        if (is_array($a)) {
            $flat = array_filter(array_map('strval', $a));

            return $flat !== [] ? implode(', ', $flat) : '—';
        }
        if (is_string($a) && trim($a) !== '') {
            return $a;
        }

        return '—';
    }
}
