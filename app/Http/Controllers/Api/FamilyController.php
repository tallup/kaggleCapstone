<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Incident;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\ResidentContact;
use App\Models\Scopes\FacilityScope;
use App\Models\SleepPattern;
use App\Models\SleepRecord;
use App\Models\TLog;
use App\Models\VitalSign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class FamilyController extends Controller
{
    /**
     * List residents linked to the authenticated family user.
     */
    public function residents(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFamily()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $contactIds = ResidentContact::where('user_id', $user->id)->pluck('resident_id')->unique()->values();
        // Same as care-updates: family access is driven by ResidentContact; do not let FacilityScope hide residents.
        $residents = Resident::withoutGlobalScope(FacilityScope::class)
            ->with(['branch' => function ($q) {
                $q->withoutGlobalScope(FacilityScope::class)->select('id', 'name', 'facility_id');
            }])
            ->whereIn('id', $contactIds)
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'first_name' => $r->first_name,
                    'last_name' => $r->last_name,
                    'branch_name' => $r->branch?->name,
                ];
            });

        return response()->json([
            'data' => $residents,
            'linked_resident_ids' => $contactIds->values()->all(),
        ]);
    }

    /**
     * Care updates for family dashboard: progress notes, meds, appointments, vitals for linked residents.
     */
    public function careUpdates(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFamily()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $residentIds = ResidentContact::where('user_id', $user->id)->pluck('resident_id')->unique()->values()->all();
        if (empty($residentIds)) {
            return response()->json([
                'linked_resident_ids' => [],
                'residents' => [],
                't_logs' => [],
                'medication_administrations' => [],
                'appointments' => [],
                'vitals_summary' => [],
                'sleep_records' => [],
                'sleep_patterns' => [],
                'incidents' => [],
            ]);
        }

        $dateFrom = $request->get('date_from', now()->subDays(7)->format('Y-m-d'));
        $dateTo = $request->get('date_to', now()->format('Y-m-d'));

        $tz = config('app.timezone');
        $todayStr = Carbon::now($tz)->toDateString();
        // When the client omits date filters (family dashboard), keep T-logs on a 7-day window but
        // only show medications for the facility's "today" — same as the dashboard card label.
        // When date_from/date_to are sent (e.g. portal Care Updates), use that range for meds.
        $explicitRange = $request->filled('date_from') || $request->filled('date_to');
        if ($explicitRange) {
            $medDateFrom = $request->get('date_from', $dateFrom);
            $medDateTo = $request->get('date_to', $dateTo);
        } else {
            $today = now($tz)->toDateString();
            $medDateFrom = $today;
            $medDateTo = $today;
        }
        $medStart = Carbon::parse($medDateFrom, $tz)->startOfDay();
        $medEnd = Carbon::parse($medDateTo, $tz)->endOfDay();

        // Family access is limited to resident_ids from ResidentContact; bypass FacilityScope so
        // T-logs and medications still load when facility_id was missing or out of sync.
        $tLogs = TLog::withoutGlobalScope(FacilityScope::class)
            ->whereIn('resident_id', $residentIds)
            ->whereBetween(DB::raw('DATE(reported_on)'), [$dateFrom, $dateTo])
            ->orderByDesc('reported_on')
            ->limit(50)
            ->get(['id', 'resident_id', 'types', 'summary', 'reported_on'])
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'resident_id' => $t->resident_id,
                    'type' => is_array($t->types) ? implode(', ', $t->types) : $t->types,
                    'summary' => $t->summary,
                    'reported_on' => $t->reported_on?->toIso8601String(),
                ];
            });

        $medicationAdministrations = MedicationAdministration::with([
            'medication' => function ($q) {
                $q->withoutGlobalScope(FacilityScope::class)->select('id', 'name');
            },
        ])
            ->whereIn('resident_id', $residentIds)
            ->whereBetween('administered_at', [$medStart, $medEnd])
            ->orderBy('administered_at')
            ->limit(100)
            ->get()
            ->map(function ($a) {
                return [
                    'resident_id' => $a->resident_id,
                    'medication_name' => $a->medication?->name ?? 'Medication',
                    'administered_at' => $a->administered_at?->toIso8601String(),
                    'status' => $a->status ?? null,
                ];
            });

        $appointments = Appointment::with(['resident:id,name', 'appointmentType:id,name'])
            ->whereIn('resident_id', $residentIds)
            ->where('appointment_date', '>=', $todayStr)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->limit(20)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'resident_id' => $a->resident_id,
                    'resident_name' => $a->resident?->name,
                    'title' => $a->title,
                    'appointment_type' => $a->appointmentType?->name,
                    'appointment_date' => $a->appointment_date?->format('Y-m-d'),
                    'appointment_time' => $a->appointment_time,
                    'provider_name' => $a->provider_name,
                    'location' => $a->location,
                    'description' => $a->description,
                    'status' => $a->status,
                ];
            });

        $vitalsSince = Carbon::now($tz)->subDays(14)->toDateString();

        $vitalsList = VitalSign::whereIn('resident_id', $residentIds)
            ->where('measurement_date', '>=', $vitalsSince)
            ->orderByDesc('measurement_date')
            ->limit(50)
            ->get()
            ->map(function ($v) {
                return [
                    'resident_id' => $v->resident_id,
                    'recorded_at' => $v->measurement_date?->toIso8601String(),
                    'blood_pressure_systolic' => $v->systolic,
                    'blood_pressure_diastolic' => $v->diastolic,
                    'heart_rate' => $v->pulse,
                    'temperature' => $v->temperature,
                    'notes' => $v->notes,
                ];
            });

        $sleepFrom = $explicitRange ? $dateFrom : Carbon::now($tz)->subDays(14)->toDateString();
        $sleepTo = $explicitRange ? $dateTo : Carbon::now($tz)->toDateString();

        $sleepRecords = SleepRecord::whereIn('resident_id', $residentIds)
            ->whereBetween('sleep_date', [$sleepFrom, $sleepTo])
            ->orderByDesc('sleep_date')
            ->orderByDesc('id')
            ->limit(60)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'resident_id' => $s->resident_id,
                    'sleep_date' => $s->sleep_date?->format('Y-m-d'),
                    'sleep_time' => $s->sleep_time,
                    'wake_time' => $s->wake_time,
                    'total_sleep_hours' => $s->total_sleep_hours !== null ? (float) $s->total_sleep_hours : null,
                    'sleep_quality' => $s->sleep_quality,
                    'sleep_quality_text' => $s->sleep_quality_text,
                    'restlessness_episodes' => $s->restlessness_episodes,
                    'notes' => $s->notes,
                ];
            });

        $sleepPatterns = SleepPattern::whereIn('resident_id', $residentIds)
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->limit(24)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'resident_id' => $p->resident_id,
                    'month' => $p->month,
                    'year' => $p->year,
                    'period' => $p->period,
                    'avg_sleep_hours' => $p->avg_sleep_hours !== null ? (float) $p->avg_sleep_hours : null,
                    'total_sleep_hours' => $p->total_sleep_hours !== null ? (float) $p->total_sleep_hours : null,
                    'common_sleep_time' => $p->common_sleep_time,
                    'common_wake_time' => $p->common_wake_time,
                    'sleep_quality_score' => $p->sleep_quality_score,
                    'key_observations' => $p->key_observations,
                    'days_with_records' => $p->days_with_records,
                    'notes' => $p->notes,
                ];
            });

        $incidentStart = Carbon::parse($explicitRange ? $dateFrom : Carbon::now($tz)->subDays(90)->toDateString(), $tz)->startOfDay();
        $incidentEnd = Carbon::parse($explicitRange ? $dateTo : Carbon::now($tz)->toDateString(), $tz)->endOfDay();

        $incidents = Incident::withoutGlobalScope(FacilityScope::class)
            ->whereIn('resident_id', $residentIds)
            ->whereBetween('incident_date', [$incidentStart, $incidentEnd])
            ->orderByDesc('incident_date')
            ->limit(40)
            ->get()
            ->map(function ($i) {
                return [
                    'id' => $i->id,
                    'resident_id' => $i->resident_id,
                    'incident_number' => $i->incident_number,
                    'incident_type' => $i->incident_type,
                    'incident_date' => $i->incident_date?->toIso8601String(),
                    'status' => $i->status,
                    'severity' => $i->severity,
                    'priority' => $i->priority,
                    'location' => $i->location,
                    'description' => $i->description,
                    'action_taken' => $i->action_taken,
                    'follow_up' => $i->follow_up,
                ];
            });

        $residentsLoaded = Resident::withoutGlobalScope(FacilityScope::class)
            ->with(['branch' => function ($q) {
                $q->withoutGlobalScope(FacilityScope::class)->select('id', 'name', 'facility_id');
            }])
            ->whereIn('id', $residentIds)
            ->get()
            ->keyBy('id');

        $contactsByResident = ResidentContact::where('user_id', $user->id)
            ->whereIn('resident_id', $residentIds)
            ->get()
            ->keyBy('resident_id');

        $residentsSummary = collect($residentIds)->map(function ($rid) use ($residentsLoaded, $contactsByResident) {
            $r = $residentsLoaded->get($rid);
            if ($r) {
                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'first_name' => $r->first_name,
                    'last_name' => $r->last_name,
                    'room' => $r->room,
                    'room_number' => $r->room_number,
                    'profile_image_url' => $r->profile_image_url,
                    'admission_date' => $r->admission_date?->format('Y-m-d'),
                    'branch_name' => $r->branch?->name,
                    'dietary_restrictions' => $r->dietary_restrictions,
                    'special_instructions' => $r->special_instructions,
                    'important_info' => [
                        'allergies' => self::formatFamilyArrayField($r->allergies),
                        'medical_conditions' => self::formatFamilyArrayField($r->medical_conditions),
                        'diagnosis' => $r->diagnosis,
                        'physician_name' => $r->physician_name,
                        'primary_care_doctor' => $r->primary_care_doctor,
                        'mobility_notes' => $r->mobility_notes,
                        'behavioral_notes' => $r->behavioral_notes,
                        'emergency_contact_name' => $r->emergency_contact_name,
                        'emergency_contact_phone' => $r->emergency_contact_phone,
                    ],
                ];
            }

            $contact = $contactsByResident->get($rid);

            return [
                'id' => (int) $rid,
                'name' => $contact?->name ?? 'Resident',
                'first_name' => null,
                'last_name' => null,
                'room' => null,
                'room_number' => null,
                'profile_image_url' => null,
                'admission_date' => null,
                'branch_name' => null,
                'dietary_restrictions' => null,
                'special_instructions' => null,
                'important_info' => null,
            ];
        })->values();

        return response()->json([
            'linked_resident_ids' => array_values($residentIds),
            'residents' => $residentsSummary,
            't_logs' => $tLogs,
            'medication_administrations' => $medicationAdministrations,
            'appointments' => $appointments,
            'vitals_summary' => $vitalsList,
            'sleep_records' => $sleepRecords,
            'sleep_patterns' => $sleepPatterns,
            'incidents' => $incidents,
        ]);
    }

    /**
     * @param  array<int, string>|string|null  $value
     */
    private static function formatFamilyArrayField(array|string|null $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_array($value)) {
            $clean = array_filter(array_map('strval', $value));

            return $clean === [] ? null : implode(', ', $clean);
        }

        return $value;
    }
}
