<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Facility;
use App\Models\Appointment;
use App\Services\PremiumReportService;
use App\Support\ReportBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AppointmentReportController extends Controller
{
    protected $premiumReportService;

    public function __construct(PremiumReportService $premiumReportService)
    {
        $this->premiumReportService = $premiumReportService;
    }

    public function __invoke(Request $request, $residentId)
    {
        $resident = Resident::findOrFail($residentId);
        
        try {
            $appointments = Appointment::where('resident_id', $resident->id)
                ->with(['appointmentType', 'healthcareProvider'])
                ->orderBy('appointment_date', 'desc')
                ->limit(50)
                ->get();

            $facility = $resident->branch?->facility ?? Facility::first();
            $branding = ReportBranding::palette($facility);

            $reportData = [];
            foreach ($appointments as $appt) {
                $reportData[] = [
                    'date' => $appt->appointment_date->format('M d, Y'),
                    'time' => $appt->appointment_time ? date('g:i A', strtotime($appt->appointment_time)) : 'N/A',
                    'title' => $appt->title,
                    'type' => $appt->appointmentType?->name ?? 'General',
                    'provider' => $appt->provider_name ?: ($appt->healthcareProvider?->name ?? 'N/A'),
                    'location' => $appt->location ?? 'N/A',
                    'status' => ucfirst($appt->status),
                    'notes' => $appt->notes ?? '',
                ];
            }

            $viewData = [
                'reportTitle' => 'Appointment History: ' . $resident->name,
                'facilityName' => $facility?->name ?? 'Evergreen Care',
                'facilityAddress' => $facility?->address,
                'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
                'appointments' => $reportData,
                'residentName' => $resident->name,
                'residentId' => $resident->id,
                'dateOfBirth' => $resident->date_of_birth?->format('M d, Y') ?? 'N/A',
                'roomNumber' => $resident->room ?? 'N/A',
                'exportedAt' => now()->format('M d, Y g:i A'),
                ...$branding
            ];

            $filename = sprintf(
                'Appointments_%s_%s.pdf',
                str_replace(' ', '_', $resident->name),
                now()->format('Y-m-d')
            );

            $pdfBinary = $this->premiumReportService->generate(
                'reports.premium-appointments-report',
                $viewData,
                $filename,
                ['orientation' => 'landscape']
            );

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Appointment History PDF generation failed', [
                'resident_id' => $resident->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to generate appointment report.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
