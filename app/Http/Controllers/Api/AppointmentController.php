<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Appointment::with(['resident', 'healthcareProvider', 'appointmentType']);

        // Filter by date
        if ($request->has('date_filter')) {
            $filter = $request->get('date_filter');
            if ($filter === 'upcoming') {
                // Include today's appointments in upcoming
                $query->whereDate('appointment_date', '>=', today());
            } elseif ($filter === 'past') {
                $query->whereDate('appointment_date', '<', today());
            }
        }

        // Filter by status
        if ($request->has('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Order by appointment date (ascending) then by created_at (descending) so newest appointments for same date show first
        $appointments = $query->orderBy('appointment_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($appointments);
    }

    public function show($id): JsonResponse
    {
        $appointment = Appointment::with(['resident', 'healthcareProvider', 'appointmentType'])
            ->findOrFail($id);

        return response()->json($appointment);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'appointment_type_id' => 'nullable|exists:appointment_types,id',
            'healthcare_provider_id' => 'nullable|exists:healthcare_providers,id',
            'appointment_date' => 'required|date',
            'appointment_time' => 'nullable|date_format:H:i',
            'provider_name' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:scheduled,completed,cancelled,confirmed,in_progress',
            'next_appointment_date' => 'nullable|date',
            'recurrence_pattern' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // Default status
        if (!isset($validated['status'])) {
            $validated['status'] = 'scheduled';
        }

        // If branch_id not provided, try to infer from resident
        if (!isset($validated['branch_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if ($resident) {
                $validated['branch_id'] = $resident->branch_id;
            }
        }

        // Auto-generate a title if missing, to satisfy NOT NULL schema in some setups
        if (!isset($validated['title']) || empty($validated['title'])) {
            $residentName = isset($resident)
                ? trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''))
                : 'Resident';
            $dateLabel = is_string($validated['appointment_date'])
                ? date('M j, Y', strtotime($validated['appointment_date']))
                : now()->toDateString();
            $timeLabel = isset($validated['appointment_time']) && !empty($validated['appointment_time'])
                ? date('g:i A', strtotime($validated['appointment_time']))
                : '';
            $withTime = $timeLabel ? " at {$timeLabel}" : '';
            $provider = $validated['provider_name'] ?? null;
            $base = $provider ? "Appointment with {$provider}" : 'Appointment';
            $validated['title'] = "$base - {$residentName} on {$dateLabel}{$withTime}";
        }

        $validated['created_by'] = auth()->id();

        $appointment = Appointment::create($validated);

        return response()->json($appointment->load(['resident', 'healthcareProvider', 'appointmentType']), 201);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        $appointment = Appointment::findOrFail($id);
        $appointment->status = $request->get('status');
        
        // Update notes if provided (especially for completed appointments)
        if ($request->has('notes')) {
            $existingNotes = $appointment->notes ? $appointment->notes . "\n\n" : '';
            $statusNote = $request->get('status') === 'completed' && $request->get('notes')
                ? "Completed on " . now()->format('Y-m-d H:i:s') . ": " . $request->get('notes')
                : '';
            $appointment->notes = $existingNotes . $statusNote;
        }
        
        $appointment->save();

        return response()->json($appointment->load(['resident', 'healthcareProvider']));
    }
}

