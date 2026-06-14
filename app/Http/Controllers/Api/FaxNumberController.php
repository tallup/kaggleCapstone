<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Models\FaxNumber;
use App\Services\Fax\FaxManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class FaxNumberController extends BaseApiController
{
    private const E164_REGEX = '/^\+[1-9]\d{1,14}$/';

    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.view')) {
            return $error;
        }

        $numbers = FaxNumber::query()
            ->orderByDesc('is_default')
            ->orderBy('e164_number')
            ->get();

        return $this->success($numbers);
    }

    /**
     * POST /api/v1/fax/numbers/search
     * Body: {area_code?, country='US', limit=10}
     * Calls the configured provider's marketplace search.
     */
    public function search(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_numbers')) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        try {
            $validated = $request->validate([
                'area_code' => ['sometimes', 'nullable', 'string', 'max:6'],
                'country' => ['sometimes', 'nullable', 'string', 'size:2'],
                'limit' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:50'],
            ]);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        try {
            $provider = app(FaxManager::class)->forFacility($facility);
        } catch (Throwable $e) {
            return $this->error('Fax provider not configured: '.$e->getMessage(), 409);
        }

        try {
            $matches = $provider->searchAvailableNumbers(
                $validated['area_code'] ?? null,
                $validated['country'] ?? 'US',
                (int) ($validated['limit'] ?? 10),
            );
        } catch (Throwable $e) {
            return $this->error('Provider search failed: '.$e->getMessage(), 502);
        }

        return $this->success([
            'results' => array_map(fn ($n) => $n->toArray(), $matches),
        ]);
    }

    /**
     * POST /api/v1/fax/numbers
     * Body: {e164_number, friendly_name?}
     * Purchases the number through the provider and persists a row.
     */
    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_numbers')) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        try {
            $validated = $request->validate([
                'e164_number' => ['required', 'string', 'max:24', 'regex:'.self::E164_REGEX],
                'friendly_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            ], [
                'e164_number.regex' => 'Number must be in E.164 format (e.g. +14255550100).',
            ]);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        $manager = app(FaxManager::class);
        $settings = $manager->settingsFor($facility);
        if (! $settings || ! $settings->isConfigured()) {
            return $this->error('Fax provider is not configured for this facility.', 409);
        }

        try {
            $provider = $manager->forFacility($facility);
            $info = $provider->purchaseNumber($validated['e164_number']);
        } catch (Throwable $e) {
            return $this->error('Provider rejected the purchase: '.$e->getMessage(), 502);
        }

        $isFirst = FaxNumber::query()->withTrashed()->count() === 0;

        $number = DB::transaction(function () use ($facility, $settings, $info, $validated, $request, $isFirst) {
            if ($isFirst) {
                FaxNumber::withoutGlobalScopes()
                    ->where('facility_id', $facility->id)
                    ->update(['is_default' => false]);
            }

            $row = new FaxNumber([
                'provider' => $settings->provider,
                'provider_number_id' => $info->providerNumberId,
                'e164_number' => $info->e164Number,
                'friendly_name' => $validated['friendly_name'] ?? null,
                'is_default' => $isFirst,
                'is_active' => true,
                'monthly_cost_cents' => $info->monthlyCostCents,
                'provisioned_at' => now(),
                'created_by' => $request->user()?->id,
            ]);
            $row->facility_id = (int) $facility->id;
            $row->save();

            return $row;
        });

        return $this->success($number, 'Number provisioned.', 201);
    }

    /**
     * PATCH /api/v1/fax/numbers/{id}
     * Allows toggling is_default (auto-unsets siblings), is_active, friendly_name.
     */
    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_numbers')) {
            return $error;
        }

        $number = FaxNumber::find($id);
        if (! $number) {
            return $this->error('Number not found.', 404);
        }

        try {
            $validated = $request->validate([
                'friendly_name' => ['sometimes', 'nullable', 'string', 'max:255'],
                'is_active' => ['sometimes', 'boolean'],
                'is_default' => ['sometimes', 'boolean'],
            ]);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        DB::transaction(function () use ($number, $validated) {
            if (array_key_exists('is_default', $validated) && (bool) $validated['is_default']) {
                FaxNumber::withoutGlobalScopes()
                    ->where('facility_id', $number->facility_id)
                    ->where('id', '!=', $number->id)
                    ->update(['is_default' => false]);
            }

            $number->fill($validated)->save();
        });

        return $this->success($number->refresh(), 'Number updated.');
    }

    /**
     * DELETE /api/v1/fax/numbers/{id}
     * Releases the number through the provider, marks released_at, soft-deletes.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_numbers')) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $number = FaxNumber::find($id);
        if (! $number) {
            return $this->error('Number not found.', 404);
        }

        try {
            $provider = app(FaxManager::class)->forFacility($facility);
            if (! empty($number->provider_number_id)) {
                $provider->releaseNumber($number->provider_number_id);
            }
        } catch (Throwable $e) {
            return $this->error('Provider release failed: '.$e->getMessage(), 502);
        }

        $number->released_at = now();
        $number->is_active = false;
        $number->is_default = false;
        $number->save();
        $number->delete();

        return $this->success(null, 'Number released.');
    }
}
