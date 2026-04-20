<?php

namespace App\Services;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\User;
use App\Support\ReportBranding;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class MedicationLogReportService
{
    private const SLOT_TOLERANCE_SECONDS = 7200;

    /**
     * Build view data for the medication log PDF.
     *
     * @param  array{
     *     include_scheduled?: bool,
     *     include_prn?: bool,
     *     include_resident_card?: bool,
     *     include_legend?: bool,
     *     include_prn_admin_notes?: bool,
     *     medication_ids?: list<int>|null,
     *     administration_outcomes?: 'all'|'taken'|'missed'
     * }  $options  medication_ids: non-empty list limits to those orders; null = all for this resident
     * @return array<string, mixed>
     */
    public function buildViewData(Resident $resident, Carbon $dateFrom, Carbon $dateTo, array $options = []): array
    {
        $includeScheduled = $options['include_scheduled'] ?? true;
        $includePrn = $options['include_prn'] ?? true;
        $includeResidentCard = $options['include_resident_card'] ?? true;
        $includeLegend = $options['include_legend'] ?? true;
        $includePrnAdminNotes = $options['include_prn_admin_notes'] ?? true;
        $medicationIdsFilter = $options['medication_ids'] ?? null;

        $tz = config('app.timezone');
        $dateFrom = $dateFrom->copy()->timezone($tz)->startOfDay();
        $dateTo = $dateTo->copy()->timezone($tz)->endOfDay();

        $resident->load(['branch.facility']);

        $medicationsQuery = Medication::query()
            ->where('resident_id', $resident->id)
            ->with(['drug'])
            ->orderBy('name');
        if (is_array($medicationIdsFilter) && $medicationIdsFilter !== []) {
            $medicationsQuery->whereIn('id', $medicationIdsFilter);
        }

        $medications = $medicationsQuery->get();

        $administrationsQuery = MedicationAdministration::query()
            ->where('resident_id', $resident->id)
            ->where('administered_at', '>=', $dateFrom)
            ->where('administered_at', '<=', $dateTo)
            ->with(['administeredBy']);
        if (is_array($medicationIdsFilter) && $medicationIdsFilter !== []) {
            $administrationsQuery->whereIn('medication_id', $medicationIdsFilter);
        }

        $administrations = $administrationsQuery->get();

        $outcomes = $options['administration_outcomes'] ?? 'all';
        if ($outcomes === 'taken') {
            $administrations = $administrations->filter(
                fn (MedicationAdministration $a) => in_array($a->status, ['completed', 'pharmacy_administration_confirm'], true)
            )->values();
        } elseif ($outcomes === 'missed') {
            $administrations = $administrations->filter(
                fn (MedicationAdministration $a) => ! in_array($a->status, ['completed', 'pharmacy_administration_confirm'], true)
            )->values();
        }

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
                if (! $includePrn) {
                    continue;
                }
                $prnSections[] = $this->buildPrnSection(
                    $medication,
                    $byMedication->get($medication->id, collect()),
                    $includePrnAdminNotes
                );

                continue;
            }

            if (! $includeScheduled) {
                continue;
            }

            $section = $this->buildScheduledSection($medication, $byMedication->get($medication->id, collect()), $days, $dateFrom, $dateTo);
            if ($section !== null) {
                $scheduledSections[] = $section;
            }
        }

        $facility = $resident->branch?->facility;
        $branch = $resident->branch;

        $residentName = trim(implode(' ', array_filter([
            $resident->first_name,
            $resident->middle_names,
            $resident->last_name,
        ]))) ?: ($resident->name ?? 'Resident');

        $palette = ReportBranding::palette($facility);

        $outcomeFilterLabel = match ($outcomes) {
            'taken' => 'Showing given administrations only (completed / confirmed).',
            'missed' => 'Showing not-given administrations only (missed, refused, held, etc.).',
            default => null,
        };

        return [
            'facilityName' => $facility?->name ?? $branch?->name ?? 'Facility',
            'facilityAddress' => $facility?->address ?? $branch?->address,
            'facilityPhone' => $facility?->phone ?? $branch?->phone,
            'branchName' => $branch?->name,
            'residentName' => $residentName,
            'residentInitials' => $this->initialsFromName($residentName),
            'residentRoom' => $resident->room_number ?: $resident->room,
            'residentDob' => $resident->date_of_birth
                ? $resident->date_of_birth->format('F j, Y')
                : '',
            'physician' => $resident->physician_name ?: $resident->primary_care_doctor ?: $resident->pep_or_doctor,
            'diagnosis' => $this->formatResidentDiagnosis($resident),
            'allergies' => $this->formatAllergies($resident),
            'diet' => $resident->dietary_restrictions ?: '—',
            'rangeLabel' => $dateFrom->format('M d, Y').' - '.$dateTo->format('M d, Y'),
            'outcomeFilterLabel' => $outcomeFilterLabel,
            'exportedAt' => Carbon::now($tz)->format('M d, Y g:i A T'),
            'days' => $days,
            'scheduledSections' => $scheduledSections,
            'prnSections' => array_values(array_filter($prnSections)),
            'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
            'residentPhotoDataUri' => ReportBranding::imageToDataUri($resident->profile_image),
            ...$palette,
        ];
    }

    private function initialsFromName(string $name): string
    {
        $name = trim($name);
        if ($name === '') {
            return '?';
        }
        $parts = preg_split('/\s+/', $name) ?: [];
        if (count($parts) >= 2) {
            return strtoupper(mb_substr($parts[0], 0, 1).mb_substr($parts[count($parts) - 1], 0, 1));
        }

        return strtoupper(mb_substr($name, 0, 2));
    }

    private function isPrnMedication(Medication $medication): bool
    {
        $ins = trim((string) ($medication->instructions ?? ''));

        return strcasecmp($ins, 'PRN') === 0;
    }

    /**
     * Normalize DB time fields to H:i:s for combineDateAndTime().
     */
    private function normalizeSlotTimeRaw(mixed $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        if ($raw instanceof \DateTimeInterface) {
            return Carbon::parse($raw)->format('H:i:s');
        }
        $s = trim((string) $raw);
        if ($s === '') {
            return null;
        }
        if (strlen($s) === 5 && $s[2] === ':') {
            return $s.':00';
        }

        return $s;
    }

    /**
     * Time slots for the MAR grid: explicit time_1…time_4, else defaults from `instructions`
     * (same map as Filament MedicationResource / ActiveMedicationsWidget).
     *
     * @return list<array{field: string, time_raw: string, label?: string}>
     */
    private function resolveScheduledTimeSlots(Medication $medication): array
    {
        $slots = [];
        foreach (['time_1', 'time_2', 'time_3', 'time_4'] as $key) {
            $norm = $this->normalizeSlotTimeRaw($medication->{$key} ?? null);
            if ($norm !== null) {
                $slots[] = ['field' => $key, 'time_raw' => $norm];
            }
        }

        if ($slots !== []) {
            return $slots;
        }

        $defaults = [
            'a.m' => ['08:00'],
            'p.m' => ['20:00'],
            'h.s' => ['22:00'],
            'b.i.d' => ['08:00', '20:00'],
            't.i.d' => ['08:00', '14:00', '20:00'],
            'q.i.d' => ['08:00', '12:00', '16:00', '20:00'],
        ];
        $key = strtolower(trim((string) ($medication->instructions ?? '')));
        if (isset($defaults[$key])) {
            foreach ($defaults[$key] as $i => $raw) {
                $slots[] = [
                    'field' => 'instruction_default_'.$i,
                    'time_raw' => $raw.':00',
                ];
            }

            return $slots;
        }

        if ($key !== '') {
            $label = $medication->instruction_display ?? $medication->instructions;

            return [[
                'field' => 'instruction_fallback',
                'time_raw' => '12:00:00',
                'label' => is_string($label) && $label !== '' ? $label : 'Scheduled',
            ]];
        }

        return [];
    }

    /**
     * @param  Collection<int, MedicationAdministration>  $medAdmins
     */
    private function buildScheduledSection(Medication $medication, Collection $medAdmins, array $days, Carbon $rangeStart, Carbon $rangeEnd): ?array
    {
        $slots = $this->resolveScheduledTimeSlots($medication);

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
                    $cells[$dateKey] = ['text' => '—', 'tone' => 'inactive'];

                    continue;
                }

                $slotTime = $this->combineDateAndTime($dayCarbon, $slot['time_raw']);
                if (! $slotTime) {
                    $cells[$dateKey] = ['text' => '—', 'tone' => 'inactive'];

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
                'time_label' => $slot['label'] ?? $this->formatTimeLabel($slot['time_raw']),
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
    private function buildPrnSection(Medication $medication, Collection $medAdmins, bool $includeAdminNotes = true): array
    {
        $drug = $medication->drug;
        $drugName = $drug?->name ?: $medication->name;

        $sorted = $medAdmins->sortBy('administered_at')->values();
        $rows = [];

        foreach ($sorted as $admin) {
            $display = $this->cellDisplayWithTone($admin);
            $rows[] = [
                'date' => $admin->administered_at->timezone(config('app.timezone'))->format('M j, Y'),
                'time' => $admin->administered_at->timezone(config('app.timezone'))->format('g:i A'),
                'initials' => $display['text'],
                'tone' => $display['tone'],
                'notes' => $includeAdminNotes ? $admin->notes : '',
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

    /**
     * @return array{text: string, tone: 'taken'|'not_taken'|'inactive'}
     */
    private function resolveCellContent(
        Medication $medication,
        Collection $medAdmins,
        Carbon $slotTime,
        Carbon $dayStart
    ): array {
        $dayEnd = $dayStart->copy()->endOfDay();

        $candidates = $medAdmins->filter(function (MedicationAdministration $a) use ($medication, $dayStart, $dayEnd) {
            if ((int) $a->medication_id !== (int) $medication->id) {
                return false;
            }
            $at = $a->administered_at->copy()->timezone(config('app.timezone'));

            return $at->between($dayStart, $dayEnd);
        });

        if ($candidates->isEmpty()) {
            return ['text' => '—', 'tone' => 'not_taken'];
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

        return $this->cellDisplayWithTone($best);
    }

    /**
     * @return array{text: string, tone: 'taken'|'not_taken'}
     */
    private function cellDisplayWithTone(MedicationAdministration $admin): array
    {
        $text = match ($admin->status) {
            'completed' => $this->userInitials($admin->administeredBy) ?: '✓',
            'missed' => 'M',
            'refused' => 'R',
            'hospital_admission' => 'H+',
            'pharmacy_administration_confirm' => 'Rx',
            default => strtoupper(substr((string) $admin->status, 0, 3)),
        };

        $taken = in_array($admin->status, ['completed', 'pharmacy_administration_confirm'], true);

        return [
            'text' => $text,
            'tone' => $taken ? 'taken' : 'not_taken',
        ];
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

    /**
     * Summary "Diagnosis" uses only the resident record. Medication-level `diagnosis`
     * is often used for sig/directions in this app and must not be merged here.
     */
    private function formatResidentDiagnosis(Resident $resident): string
    {
        $d = $resident->diagnosis;
        if (is_string($d) && trim($d) !== '') {
            return trim($d);
        }

        return '—';
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
