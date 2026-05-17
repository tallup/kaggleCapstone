<?php

namespace App\Jobs;

use App\Events\FaxStatusUpdated;
use App\Models\Facility;
use App\Models\Fax;
use App\Models\FaxNumber;
use App\Services\Fax\FaxManager;
use App\Services\Fax\Support\SendFaxRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Dispatches a previously-queued Fax row to the configured provider.
 *
 * Constructed with the Fax id (NOT the model) so we can re-resolve via
 * withoutGlobalScopes() — the job worker has no authenticated user, so
 * the FacilityScope would otherwise hide the row.
 */
class SendFaxJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $faxId) {}

    public function handle(FaxManager $manager): void
    {
        $fax = Fax::withoutGlobalScopes()->find($this->faxId);
        if (! $fax) {
            Log::warning('SendFaxJob: fax row missing', ['fax_id' => $this->faxId]);

            return;
        }

        $facility = Facility::find($fax->facility_id);
        if (! $facility) {
            $this->markFailed($fax, $manager, 'Facility missing.');

            return;
        }

        // Bind facility so any nested scoped reads/writes work.
        app()->instance('facility', $facility);

        $settings = $manager->settingsFor($facility);
        if (! $settings || ! $settings->isConfigured()) {
            $this->markFailed($fax, $manager, 'Fax provider not configured for facility.');

            return;
        }

        $fromNumber = $fax->from_number_id
            ? FaxNumber::withoutGlobalScopes()->find($fax->from_number_id)
            : null;
        if (! $fromNumber) {
            $this->markFailed($fax, $manager, 'Source fax number missing.');

            return;
        }

        $disk = Storage::disk(config('fax.disk', 'local'));
        if (! $fax->file_path || ! $disk->exists($fax->file_path)) {
            $this->markFailed($fax, $manager, 'Source PDF missing from disk.');

            return;
        }

        // Materialize PDF to a temp file so providers can stream it. We do
        // this regardless of disk type so providers don't have to care
        // whether the storage backend is local or s3.
        $tmpPath = tempnam(sys_get_temp_dir(), 'fax_');
        if ($tmpPath === false) {
            throw new RuntimeException('Could not allocate temp file for fax send.');
        }
        file_put_contents($tmpPath, $disk->get($fax->file_path));

        // Move row into 'sending' so the UI reflects the in-flight state.
        $fax->status = Fax::STATUS_SENDING;
        $fax->save();

        $manager->recordEvent($fax, 'send_attempt', [
            'attempt' => (int) $fax->retry_count + 1,
        ]);

        try {
            $provider = $manager->forFacility($facility);

            $request = new SendFaxRequest(
                fromNumber: $fax->from_number ?: $fromNumber->e164_number,
                toNumber: $fax->to_number,
                filePath: $tmpPath,
                coverPageHtml: $fax->cover_page_html,
                subject: $fax->subject,
                clientReference: 'fax:'.$fax->id,
            );

            $result = $provider->send($request);

            if ($result->ok) {
                $fax->provider_fax_id = $result->providerFaxId;
                $fax->status = $result->status ?: Fax::STATUS_QUEUED;
                $fax->status_reason = null;
                $fax->sent_at = now();
                $fax->save();

                $manager->recordEvent($fax, 'sent', [
                    'provider_fax_id' => $result->providerFaxId,
                    'raw' => $result->raw,
                ]);

                broadcast(new FaxStatusUpdated($fax->refresh()));

                return;
            }

            $reason = $result->message ?: 'Provider rejected fax.';
            if ($this->attempts() < $this->tries) {
                throw new RuntimeException($reason);
            }

            $this->markFailed($fax, $manager, $reason, $result->raw);
        } catch (Throwable $e) {
            $reason = $e->getMessage();
            if ($this->attempts() < $this->tries) {
                $manager->recordEvent($fax, 'send_retry', [
                    'attempt' => $this->attempts(),
                    'reason' => $reason,
                ]);

                throw $e;
            }

            $this->markFailed($fax, $manager, $reason);
        } finally {
            if (is_file($tmpPath)) {
                @unlink($tmpPath);
            }
        }
    }

    public function failed(Throwable $exception): void
    {
        $fax = Fax::withoutGlobalScopes()->find($this->faxId);
        if (! $fax || $fax->status === Fax::STATUS_FAILED) {
            return;
        }

        $manager = app(FaxManager::class);
        $this->markFailed($fax, $manager, $exception->getMessage());
    }

    private function markFailed(Fax $fax, FaxManager $manager, string $reason, array $raw = []): void
    {
        $fax->status = Fax::STATUS_FAILED;
        $fax->status_reason = $reason;
        $fax->save();

        $manager->recordEvent($fax, 'send_failed', array_merge($raw, [
            'reason' => $reason,
        ]));

        broadcast(new FaxStatusUpdated($fax->refresh()));
    }
}
