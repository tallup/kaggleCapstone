<?php

namespace App\Http\Controllers\Api;

use App\Models\TLog;
use App\Models\Incident;
use App\Models\Resident;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\VitalSign;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class ComplianceReportController extends BaseApiController
{
    /**
     * Generate inspection-ready ZIP package: care logs, incidents, residents, medications, vitals.
     * Query params: date_from, date_to, branch_id (optional)
     */
    public function inspectionPackage(Request $request): StreamedResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        $branchId = $request->get('branch_id');
        $user = $request->user();

        $tmpDir = storage_path('app/tmp/compliance_' . uniqid());
        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }

        try {
            // 1. Resident care logs (progress notes)
            $tLogsQuery = TLog::with(['resident', 'branch', 'reporter', 'enteredBy'])
                ->whereDate('reported_on', '>=', $dateFrom)
                ->whereDate('reported_on', '<=', $dateTo);
            $this->applyFacilityFilter($tLogsQuery, $user);
            if ($branchId) {
                $tLogsQuery->where('branch_id', $branchId);
            }
            $tLogs = $tLogsQuery->orderBy('reported_on', 'desc')->get();
            $this->writeCareLogsCsv($tmpDir . '/resident_care_logs.csv', $tLogs);

            // 2. Incident reports
            $incidentsQuery = Incident::with(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy'])
                ->whereDate('incident_date', '>=', $dateFrom)
                ->whereDate('incident_date', '<=', $dateTo);
            $this->applyFacilityFilter($incidentsQuery, $user);
            if ($branchId) {
                $incidentsQuery->where('branch_id', $branchId);
            }
            $incidents = $incidentsQuery->orderBy('incident_date', 'desc')->get();
            $this->writeIncidentsCsv($tmpDir . '/incident_reports.csv', $incidents);

            // 3. Resident list
            $residentsQuery = Resident::with(['branch', 'vitalSigns' => fn ($q) => $q->latest('measurement_date')->limit(1)]);
            if ($branchId) {
                $residentsQuery->where('branch_id', $branchId);
            }
            $residents = $residentsQuery->get();
            $this->writeResidentsCsv($tmpDir . '/resident_list.csv', $residents);

            // 4. Medication report (active medications with last administration)
            $medsQuery = Medication::with(['resident', 'branch', 'administrations' => fn ($q) => $q->where('status', 'completed')->latest('administered_at')->limit(1)->with('administeredBy')])
                ->where('is_active', true);
            if ($branchId) {
                $medsQuery->where('branch_id', $branchId);
            }
            $medications = $medsQuery->orderBy('resident_id')->get();
            $this->writeMedicationsCsv($tmpDir . '/medication_report.csv', $medications);

            // 5. Vitals summary (date range) - scope by facility via branch
            $vitalsQuery = VitalSign::with(['resident', 'branch'])
                ->whereDate('measurement_date', '>=', $dateFrom)
                ->whereDate('measurement_date', '<=', $dateTo);
            if ($branchId) {
                $vitalsQuery->where('branch_id', $branchId);
            } elseif ($user && $user->role !== 'super_admin' && $user->facility_id) {
                $vitalsQuery->whereHas('branch', fn ($q) => $q->where('facility_id', $user->facility_id));
            }
            $vitals = $vitalsQuery->orderBy('measurement_date', 'desc')->get();
            $this->writeVitalsCsv($tmpDir . '/vitals_summary.csv', $vitals);

            // Build ZIP
            $zipPath = storage_path('app/tmp/inspection_package_' . uniqid() . '.zip');
            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \RuntimeException('Could not create ZIP file.');
            }
            foreach (glob($tmpDir . '/*.csv') as $file) {
                $zip->addFile($file, basename($file));
            }
            $zip->close();

            // Cleanup CSV files
            foreach (glob($tmpDir . '/*.csv') as $file) {
                @unlink($file);
            }
            @rmdir($tmpDir);

            $downloadName = 'inspection_package_' . $dateFrom . '_to_' . $dateTo . '.zip';

            return response()->streamDownload(function () use ($zipPath) {
                echo file_get_contents($zipPath);
                @unlink($zipPath);
            }, $downloadName, [
                'Content-Type' => 'application/zip',
                'Content-Disposition' => 'attachment; filename="' . $downloadName . '"',
            ]);
        } catch (\Throwable $e) {
            if (is_dir($tmpDir)) {
                foreach (glob($tmpDir . '/*') as $f) {
                    @unlink($f);
                }
                @rmdir($tmpDir);
            }
            throw $e;
        }
    }

    private function writeCareLogsCsv(string $path, $tLogs): void
    {
        $f = fopen($path, 'w');
        fputcsv($f, ['Resident Name', 'Branch', 'Date', 'Types', 'Notification Level', 'Summary', 'Description', 'Reporter', 'Reported On']);
        foreach ($tLogs as $log) {
            fputcsv($f, [
                $log->resident?->name ?? '',
                $log->branch?->name ?? '',
                $log->reported_on?->format('Y-m-d') ?? '',
                is_array($log->types) ? implode(', ', $log->types) : (string) $log->types,
                $log->notification_level ?? '',
                $log->summary ?? '',
                $log->description ?? '',
                $log->reporter?->name ?? '',
                $log->reported_on?->format('Y-m-d H:i') ?? '',
            ]);
        }
        fclose($f);
    }

    private function writeIncidentsCsv(string $path, $incidents): void
    {
        $f = fopen($path, 'w');
        fputcsv($f, ['Incident Number', 'Resident', 'Branch', 'Type', 'Severity', 'Status', 'Incident Date', 'Location', 'Description', 'Action Taken', 'Reported By', 'Resolved At']);
        foreach ($incidents as $inc) {
            fputcsv($f, [
                $inc->incident_number ?? '',
                $inc->resident ? trim($inc->resident->first_name . ' ' . $inc->resident->last_name) : '',
                $inc->branch?->name ?? '',
                $inc->incident_type ?? '',
                $inc->severity ?? '',
                $inc->status ?? '',
                $inc->incident_date?->format('Y-m-d H:i') ?? '',
                $inc->location ?? '',
                $inc->description ?? '',
                $inc->action_taken ?? '',
                $inc->reportedBy?->name ?? '',
                $inc->resolved_at?->format('Y-m-d H:i') ?? '',
            ]);
        }
        fclose($f);
    }

    private function writeResidentsCsv(string $path, $residents): void
    {
        $f = fopen($path, 'w');
        fputcsv($f, ['Name', 'Room', 'Branch', 'Admission Date', 'Status', 'Last Vitals Date']);
        foreach ($residents as $r) {
            $latestVitals = $r->vitalSigns->first();
            fputcsv($f, [
                $r->name ?? trim(($r->first_name ?? '') . ' ' . ($r->last_name ?? '')),
                $r->room ?? $r->room_number ?? '',
                $r->branch?->name ?? '',
                $r->admission_date?->format('Y-m-d') ?? '',
                $r->status ?? '',
                $latestVitals ? $latestVitals->measurement_date->format('Y-m-d') : '',
            ]);
        }
        fclose($f);
    }

    private function writeMedicationsCsv(string $path, $medications): void
    {
        $f = fopen($path, 'w');
        fputcsv($f, ['Resident', 'Branch', 'Medication', 'Instructions', 'Start Date', 'End Date', 'Last Administered', 'Administered By']);
        foreach ($medications as $m) {
            $lastAdmin = $m->administrations->first();
            fputcsv($f, [
                $m->resident ? trim($m->resident->first_name . ' ' . $m->resident->last_name) : '',
                $m->branch?->name ?? '',
                $m->name ?? '',
                $m->instructions ?? '',
                $m->start_date?->format('Y-m-d') ?? '',
                $m->end_date?->format('Y-m-d') ?? '',
                $lastAdmin?->administered_at?->format('Y-m-d H:i') ?? '',
                $lastAdmin?->administeredBy?->name ?? '',
            ]);
        }
        fclose($f);
    }

    private function writeVitalsCsv(string $path, $vitals): void
    {
        $f = fopen($path, 'w');
        fputcsv($f, ['Date', 'Resident', 'Branch', 'Systolic', 'Diastolic', 'Temperature', 'Pulse', 'Oxygen Saturation', 'Notes']);
        foreach ($vitals as $v) {
            fputcsv($f, [
                $v->measurement_date?->format('Y-m-d H:i') ?? '',
                $v->resident ? trim($v->resident->first_name . ' ' . $v->resident->last_name) : '',
                $v->branch?->name ?? '',
                $v->systolic ?? '',
                $v->diastolic ?? '',
                $v->temperature ?? '',
                $v->pulse ?? '',
                $v->oxygen_saturation ?? '',
                $v->notes ?? '',
            ]);
        }
        fclose($f);
    }
}
