<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Facility;
use App\Models\VitalSign;
use App\Services\PremiumReportService;
use App\Support\ReportBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VitalsLogReportController extends Controller
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
            $vitals = VitalSign::where('resident_id', $resident->id)
                ->with('takenBy')
                ->latest('measurement_date')
                ->limit(60) // Show last 60 records
                ->get();

            $facility = $resident->branch?->facility ?? Facility::first();
            $branding = ReportBranding::palette($facility);

            $reportData = [];
            foreach ($vitals as $vital) {
                $reportData[] = [
                    'date' => $vital->measurement_date->format('Y-m-d'),
                    'time' => $vital->created_at?->format('H:i') ?? '',
                    'systolic' => $vital->systolic,
                    'diastolic' => $vital->diastolic,
                    'pulse' => $vital->pulse,
                    'temperature' => $vital->temperature,
                    'oxygen_saturation' => $vital->oxygen_saturation,
                    'weight' => $vital->weight,
                    'bmi' => $vital->weight && $resident->height ? round(($vital->weight / ($resident->height * $resident->height)) * 703, 1) : 'N/A',
                    'resident_name' => $resident->name,
                    'taken_by' => $vital->takenBy?->name ?? 'N/A',
                ];
            }

            $data = [
                'reportTitle' => 'Vitals Log: ' . $resident->name,
                'facilityName' => $facility?->name ?? 'Evergreen Care',
                'facilityAddress' => $facility?->address,
                'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
                'vitals' => $reportData,
                'residentName' => $resident->name,
                'dateOfBirth' => $resident->date_of_birth?->format('M d, Y') ?? 'N/A',
                'roomNumber' => $resident->room ?? 'N/A',
                'exportedAt' => now()->format('M d, Y g:i A'),
                ...$branding
            ];

            $filename = sprintf(
                'Vitals_Log_%s_%s.pdf',
                str_replace(' ', '_', $resident->name),
                now()->format('Y-m-d')
            );

            $pdfBinary = $this->premiumReportService->generate(
                'reports.premium-vitals-report',
                $data,
                $filename,
                ['orientation' => 'landscape']
            );

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Vitals Log PDF generation failed', [
                'resident_id' => $resident->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to generate vitals report.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
