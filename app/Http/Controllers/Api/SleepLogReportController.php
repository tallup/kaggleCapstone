<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Facility;
use App\Models\SleepRecord;
use App\Services\PremiumReportService;
use App\Support\ReportBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SleepLogReportController extends Controller
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
            $records = SleepRecord::where('resident_id', $resident->id)
                ->with('createdBy')
                ->latest('sleep_date')
                ->limit(60)
                ->get();

            $facility = $resident->branch?->facility ?? Facility::first();
            $branding = ReportBranding::palette($facility);

            $reportData = [];
            foreach ($records as $record) {
                $reportData[] = [
                    'date' => $record->sleep_date->format('Y-m-d'),
                    'sleep_time' => $record->sleep_time ? date('g:i A', strtotime($record->sleep_time)) : 'N/A',
                    'wake_time' => $record->wake_time ? date('g:i A', strtotime($record->wake_time)) : 'N/A',
                    'duration' => $record->total_sleep_hours . ' hrs',
                    'quality' => $record->sleep_quality_text,
                    'restlessness' => $record->restlessness_episodes ?? 0,
                    'notes' => $record->notes ?? '',
                    'recorded_by' => $record->createdBy?->name ?? 'N/A',
                ];
            }

            $viewData = [
                'reportTitle' => 'Sleep Historical Log: ' . $resident->name,
                'facilityName' => $facility?->name ?? 'Evergreen Care',
                'facilityAddress' => $facility?->address,
                'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
                'records' => $reportData,
                'residentName' => $resident->name,
                'residentId' => $resident->id,
                'dateOfBirth' => $resident->date_of_birth?->format('M d, Y') ?? 'N/A',
                'roomNumber' => $resident->room ?? 'N/A',
                'exportedAt' => now()->format('M d, Y g:i A'),
                ...$branding
            ];

            $filename = sprintf(
                'Sleep_Log_%s_%s.pdf',
                str_replace(' ', '_', $resident->name),
                now()->format('Y-m-d')
            );

            $pdfBinary = $this->premiumReportService->generate(
                'reports.premium-sleep-report',
                $viewData,
                $filename,
                ['orientation' => 'landscape']
            );

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Sleep Log PDF generation failed', [
                'resident_id' => $resident->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to generate sleep report.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
