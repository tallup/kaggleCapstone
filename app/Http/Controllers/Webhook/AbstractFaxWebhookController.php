<?php

namespace App\Http\Controllers\Webhook;

use App\Events\FaxReceived;
use App\Events\FaxStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\Fax;
use App\Models\FaxEvent;
use App\Models\FaxSetting;
use App\Services\Fax\FaxManager;
use App\Services\Fax\ProviderRegistry;
use App\Services\Fax\Support\WebhookResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Base class for per-provider inbound webhook receivers.
 *
 * Subclasses only declare which provider key they handle; the orchestration
 * (route -> settings lookup -> signature verify -> parse -> dispatch ->
 * broadcast) lives here. No authenticated user is present, so every query
 * MUST be done with withoutGlobalScopes(), and the facility is bound into
 * the container before recordInbound() so any nested scoped writes work.
 */
abstract class AbstractFaxWebhookController extends Controller
{
    /** Provider key matching FaxProvider::key(): 'telnyx' | 'documo' | 'fake' */
    abstract protected function providerKey(): string;

    public function __invoke(Request $request, string $secret): Response
    {
        $providerKey = $this->providerKey();

        $settings = FaxSetting::withoutGlobalScopes()
            ->where('webhook_secret', $secret)
            ->where('provider', $providerKey)
            ->first();

        if (! $settings) {
            return response()->json(['error' => 'Not found.'], 404);
        }

        $facility = Facility::find($settings->facility_id);
        if (! $facility) {
            return response()->json(['error' => 'Facility missing.'], 404);
        }

        // Bind facility so any scoped writes triggered downstream work.
        app()->instance('facility', $facility);

        $registry = app(ProviderRegistry::class);
        if (! $registry->has($providerKey)) {
            return response()->json(['error' => 'Provider not registered.'], 410);
        }

        $provider = $registry->make($providerKey, $settings->credentials ?? []);

        try {
            $provider->verifyWebhookSignature($request);
        } catch (Throwable $e) {
            Log::warning('Fax webhook signature rejected', [
                'provider' => $providerKey,
                'facility_id' => $facility->id,
                'reason' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Invalid signature.'], 401);
        }

        try {
            $result = $provider->parseWebhook($request);
        } catch (Throwable $e) {
            Log::error('Fax webhook parse failed', [
                'provider' => $providerKey,
                'facility_id' => $facility->id,
                'reason' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Could not parse webhook payload.'], 422);
        }

        if ($result->kind === WebhookResult::KIND_IGNORE) {
            return response()->noContent();
        }

        // Idempotency guard: if we've already seen this provider event id,
        // ack immediately so the provider stops retrying.
        if ($result->providerEventId) {
            $seen = FaxEvent::withoutGlobalScopes()
                ->where('provider_event_id', $result->providerEventId)
                ->exists();
            if ($seen) {
                return response()->noContent();
            }
        }

        $manager = app(FaxManager::class);

        try {
            if ($result->kind === WebhookResult::KIND_STATUS) {
                $fax = Fax::withoutGlobalScopes()
                    ->where('provider', $providerKey)
                    ->where('provider_fax_id', $result->providerFaxId)
                    ->first();

                if (! $fax) {
                    Log::info('Fax webhook status for unknown provider_fax_id', [
                        'provider' => $providerKey,
                        'provider_fax_id' => $result->providerFaxId,
                    ]);

                    return response()->noContent();
                }

                $manager->applyStatus(
                    $fax,
                    $result->newStatus ?: $fax->status,
                    $result->statusReason,
                    $result->providerEventId,
                    $result->raw,
                );

                broadcast(new FaxStatusUpdated($fax->refresh()));
            } elseif ($result->kind === WebhookResult::KIND_INBOUND && $result->inbound) {
                $fax = $manager->recordInbound($facility, $settings, $result->inbound);
                broadcast(new FaxReceived($fax));
            }
        } catch (Throwable $e) {
            Log::error('Fax webhook handling failed', [
                'provider' => $providerKey,
                'facility_id' => $facility->id,
                'reason' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Webhook processing failed.'], 500);
        }

        return response()->json(['ok' => true]);
    }

    protected function jsonResponse(array $data, int $status = 200): JsonResponse
    {
        // Provided for subclasses that need to deviate from the base flow.
        return response()->json($data, $status);
    }

    protected function unauthorized(string $message): JsonResponse
    {
        throw new RuntimeException($message);
    }
}
