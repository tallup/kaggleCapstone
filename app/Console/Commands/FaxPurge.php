<?php

namespace App\Console\Commands;

use App\Models\Fax;
use App\Models\FaxSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Honour per-facility fax retention windows.
 *
 * Scheduled daily at 03:30 (see routes/console.php). For each FaxSetting
 * row we delete the PDF on the configured disk and soft-delete the Fax
 * row for any fax older than the facility's `retention_days` window.
 *
 * `--dry-run` reports counts without touching disk or DB.
 */
class FaxPurge extends Command
{
    protected $signature = 'fax:purge
        {--dry-run : Show what would be deleted without acting}
        {--facility= : Restrict to a single facility id}';

    protected $description = 'Delete fax PDFs and rows past their facility retention window.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $onlyFacility = $this->option('facility');

        $settings = FaxSetting::withoutGlobalScopes();
        if ($onlyFacility) {
            $settings = $settings->where('facility_id', (int) $onlyFacility);
        }
        $settings = $settings->get();

        if ($settings->isEmpty()) {
            $this->info('No fax_settings rows found.');

            return self::SUCCESS;
        }

        $disk = Storage::disk(config('fax.disk', 'local'));

        $totalCandidates = 0;
        $totalDeletedRows = 0;
        $totalDeletedFiles = 0;
        $totalMissingFiles = 0;

        foreach ($settings as $setting) {
            $retentionDays = (int) ($setting->retention_days ?? 0);
            if ($retentionDays <= 0) {
                $this->warn("Facility {$setting->facility_id}: retention_days not set; skipping.");

                continue;
            }

            $cutoff = now()->subDays($retentionDays);

            $faxes = Fax::withoutGlobalScopes()
                ->where('facility_id', $setting->facility_id)
                ->where('created_at', '<', $cutoff)
                ->get();

            $count = $faxes->count();
            $totalCandidates += $count;

            if ($count === 0) {
                continue;
            }

            if ($dryRun) {
                $this->info("[dry-run] Facility {$setting->facility_id}: {$count} fax row(s) past retention ({$retentionDays}d).");

                continue;
            }

            foreach ($faxes as $fax) {
                if (! empty($fax->file_path)) {
                    if ($disk->exists($fax->file_path)) {
                        $disk->delete($fax->file_path);
                        $totalDeletedFiles++;
                    } else {
                        $totalMissingFiles++;
                    }
                }

                $fax->delete();
                $totalDeletedRows++;
            }

            $this->info("Facility {$setting->facility_id}: purged {$count} fax row(s) (retention {$retentionDays}d).");
        }

        if ($dryRun) {
            $this->info("Dry run complete. {$totalCandidates} fax row(s) would be purged.");
        } else {
            $this->info("Purge complete. Rows deleted: {$totalDeletedRows}, files deleted: {$totalDeletedFiles}, files missing: {$totalMissingFiles}.");
        }

        return self::SUCCESS;
    }
}
