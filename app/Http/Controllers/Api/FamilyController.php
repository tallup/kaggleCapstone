<?php

namespace App\Http\Controllers\Api;

use App\Models\Appointment;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\ResidentContact;
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
        $residents = Resident::with('branch')
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

        return response()->json(['data' => $residents]);
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
                't_logs' => [],
                'medication_administrations' => [],
                'appointments' => [],
                'vitals_summary' => [],
            ]);
        }

        $dateFrom = $request->get('date_from', now()->subDays(7)->format('Y-m-d'));
        $dateTo = $request->get('date_to', now()->format('Y-m-d'));

        $tz = config('app.timezone');
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

        $tLogs = TLog::whereIn('resident_id', $residentIds)
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

        $medicationAdministrations = MedicationAdministration::with(['medication:id,name'])
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

        $appointments = Appointment::with('resident:id,name')
            ->whereIn('resident_id', $residentIds)
            ->where('appointment_date', '>=', now()->toDateString())
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->limit(20)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'resident_id' => $a->resident_id,
                    'resident_name' => $a->resident?->name,
                    'appointment_date' => $a->appointment_date,
                    'appointment_time' => $a->appointment_time,
                    'provider_name' => $a->provider_name,
                    'location' => $a->location,
                ];
            });

        $vitalsList = VitalSign::whereIn('resident_id', $residentIds)
            ->where('recorded_at', '>=', now()->subDays(14))
            ->orderByDesc('recorded_at')
            ->limit(50)
            ->get()
            ->map(function ($v) {
                return [
                    'resident_id' => $v->resident_id,
                    'recorded_at' => $v->recorded_at?->toIso8601String(),
                    'blood_pressure_systolic' => $v->blood_pressure_systolic,
                    'blood_pressure_diastolic' => $v->blood_pressure_diastolic,
                    'heart_rate' => $v->heart_rate,
                    'temperature' => $v->temperature,
                    'notes' => $v->notes,
                ];
            });

        return response()->json([
            't_logs' => $tLogs,
            'medication_administrations' => $medicationAdministrations,
            'appointments' => $appointments,
            'vitals_summary' => $vitalsList,
        ]);
    }
}
