<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;

class SaasBillingController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $facility = $this->resolveBillableFacility($user);
        if ($facility instanceof JsonResponse) {
            return $facility;
        }

        $sub = $facility->subscription('default');
        $planName = $this->planNameForPriceId($sub?->stripe_price);

        return response()->json([
            'data' => [
                'billing_contact' => [
                    'name' => $facility->name,
                    'email' => $facility->email,
                    'phone' => $facility->phone,
                    'address' => $facility->address,
                ],
                'stripe' => [
                    'has_customer' => $facility->hasStripeId(),
                    'pm_type' => $facility->pm_type,
                    'pm_last_four' => $facility->pm_last_four,
                ],
                'subscription' => $sub ? [
                    'status' => $sub->stripe_status,
                    'plan_name' => $planName,
                    'price_id' => $sub->stripe_price,
                    'ends_at' => $sub->ends_at?->toIso8601String(),
                    'trial_ends_at' => $sub->trial_ends_at?->toIso8601String(),
                ] : null,
                'is_subscribed' => $facility->subscribed('default'),
            ],
        ]);
    }

    public function portal(Request $request): JsonResponse
    {
        if (! is_string(config('cashier.secret')) || trim((string) config('cashier.secret')) === '') {
            Log::error('SaaS billing portal: STRIPE_SECRET / cashier.secret is not set');

            return response()->json([
                'message' => 'Billing is not configured on the server. Add STRIPE_SECRET to the environment and redeploy.',
            ], 503);
        }

        $user = $request->user();
        $facility = $this->resolveBillableFacility($user);
        if ($facility instanceof JsonResponse) {
            return $facility;
        }

        try {
            if (! $facility->hasStripeId()) {
                if (! $facility->email) {
                    return response()->json([
                        'message' => 'Add a facility email in settings before opening the billing portal.',
                    ], 422);
                }
                $facility->createAsStripeCustomer();
            }

            $base = rtrim((string) config('app.frontend_url'), '/');
            if ($base === '' || ! str_starts_with($base, 'http')) {
                $base = rtrim((string) config('app.url'), '/');
            }
            $returnUrl = $base.'/administration/billing';

            $url = $facility->fresh()->billingPortalUrl($returnUrl);

            return response()->json(['data' => ['url' => $url]]);
        } catch (ApiErrorException $e) {
            Log::warning('SaaS billing portal Stripe API error', [
                'facility_id' => $facility->id,
                'stripe_code' => $e->getStripeCode(),
                'message' => $e->getMessage(),
                'http_status' => $e->getHttpStatus(),
            ]);

            return response()->json([
                'message' => $this->userFacingStripeError($e),
            ], 502);
        } catch (\Throwable $e) {
            Log::error('SaaS billing portal failed', [
                'facility_id' => $facility->id,
                'exception' => $e,
            ]);

            return response()->json([
                'message' => 'Could not open the billing portal. Check server logs or contact support.',
            ], 500);
        }
    }

    private function userFacingStripeError(ApiErrorException $e): string
    {
        $msg = $e->getMessage() ?: 'Stripe request failed.';

        if (str_contains($msg, 'No such customer') || $e->getStripeCode() === 'resource_missing') {
            return 'The Stripe customer record is missing. Contact support so we can re-link this facility in Stripe.';
        }

        if (str_contains($msg, 'port') || str_contains($msg, 'portal') || str_contains($msg, 'configuration')) {
            return 'Enable and configure the Stripe Customer (Billing) portal in the Stripe Dashboard, and add this site\'s domain to allowed return URLs. Stripe said: '.$msg;
        }

        if (str_contains($msg, 'return_url') || str_contains($msg, 'return url')) {
            $host = parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'your domain';

            return "In Stripe → Settings → Customer portal, add this site's URL to allowed return URLs (domain: {$host}). ".$msg;
        }

        if (str_contains($msg, 'api_key') || str_contains($msg, 'API key') || str_contains($msg, 'No API key')) {
            return 'Invalid or missing Stripe API key. Set STRIPE_KEY and STRIPE_SECRET for this environment.';
        }

        return $msg;
    }

    private function planNameForPriceId(?string $priceId): ?string
    {
        if (! $priceId) {
            return null;
        }
        foreach (config('billing.plans', []) as $plan) {
            if (($plan['price_id'] ?? null) === $priceId) {
                return $plan['name'] ?? null;
            }
        }

        return null;
    }

    /**
     * @return Facility|\Illuminate\Http\JsonResponse
     */
    private function resolveBillableFacility($user)
    {
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            try {
                $facility = app()->bound('facility') ? app('facility') : null;
            } catch (\Throwable) {
                $facility = null;
            }
            if (! $facility instanceof Facility) {
                return response()->json([
                    'message' => 'Select a facility context (e.g. open this facility) to manage its subscription.',
                ], 400);
            }

            return $facility;
        }

        if (! $user->isFacilityAdministrator()) {
            return response()->json([
                'message' => 'Only facility administrators can manage subscription and billing.',
            ], 403);
        }

        if (! $user->facility_id) {
            return response()->json(['message' => 'No facility is assigned to this account.'], 403);
        }

        $facility = Facility::query()->whereKey($user->facility_id)->first();
        if (! $facility) {
            return response()->json(['message' => 'Facility not found.'], 404);
        }

        return $facility;
    }
}
