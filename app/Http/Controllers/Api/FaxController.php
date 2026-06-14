<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Jobs\SendFaxJob;
use App\Models\Fax;
use App\Models\FaxContact;
use App\Models\FaxNumber;
use App\Models\FaxSetting;
use App\Services\Fax\FaxManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FaxController extends BaseApiController
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

        $query = Fax::with(['contact', 'resident', 'fromNumber', 'sentByUser']);

        if ($request->filled('direction')) {
            $query->where('direction', $request->get('direction'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        if ($request->filled('type')) {
            $query->where('fax_type', $request->get('type'));
        }

        if ($request->filled('contact_id')) {
            $query->where('contact_id', $request->get('contact_id'));
        }

        if ($request->filled('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        if ($request->filled('sender_id')) {
            $query->where('sent_by_user_id', $request->get('sender_id'));
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->get('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->get('to'));
        }

        if ($request->filled('search')) {
            $like = '%'.trim((string) $request->get('search')).'%';
            $query->where(function ($q) use ($like) {
                $q->where('subject', 'like', $like)
                    ->orWhere('from_number', 'like', $like)
                    ->orWhere('to_number', 'like', $like);
            });
        }

        $query->orderByDesc('created_at');

        return $this->paginate($request, $query, 25);
    }

    public function show(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.view')) {
            return $error;
        }

        $fax = Fax::with(['contact', 'resident', 'fromNumber', 'sentByUser', 'events'])->find($id);
        if (! $fax) {
            return $this->error('Fax not found.', 404);
        }

        return $this->success($fax);
    }

    /**
     * POST /api/v1/fax/send
     * Stores the PDF, persists a queued Fax row, dispatches SendFaxJob.
     */
    public function send(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.send')) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $settings = app(FaxManager::class)->settingsFor($facility);
        if (! $settings || ! $settings->isConfigured()) {
            return $this->error('Fax provider is not configured for this facility.', 409);
        }

        $maxMb = (int) (config('fax.max_file_mb', $settings->max_file_mb ?? 25));
        $maxKb = max(1, $maxMb) * 1024;

        $types = array_keys((array) config('fax.types', []));
        if (empty($types)) {
            $types = ['refills', 'orders', 'records'];
        }

        try {
            $validated = $request->validate([
                'file' => ['required', 'file', 'mimes:pdf', 'max:'.$maxKb],
                'to_contact_id' => ['nullable', 'integer', 'exists:fax_contacts,id'],
                'to_number' => ['nullable', 'string', 'max:24', 'regex:'.self::E164_REGEX],
                'from_number_id' => ['nullable', 'integer', 'exists:fax_numbers,id'],
                'fax_type' => ['required', 'string', Rule::in($types)],
                'subject' => ['nullable', 'string', 'max:255'],
                'resident_id' => ['nullable', 'integer', 'exists:residents,id'],
                'cover_page_html' => ['nullable', 'string'],
            ], [
                'to_number.regex' => 'Destination number must be in E.164 format (e.g. +14255550100).',
            ]);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        if (empty($validated['to_contact_id']) && empty($validated['to_number'])) {
            return $this->error('Either to_contact_id or to_number is required.', 422, [
                'to_number' => ['Either to_contact_id or to_number is required.'],
            ]);
        }

        $contact = null;
        $toNumber = $validated['to_number'] ?? null;
        if (! empty($validated['to_contact_id'])) {
            $contact = FaxContact::find($validated['to_contact_id']);
            if (! $contact) {
                return $this->error('Contact not found.', 404);
            }
            $toNumber = $toNumber ?: $contact->fax_e164;
        }

        if (! $toNumber || ! preg_match(self::E164_REGEX, $toNumber)) {
            return $this->error('Destination number is invalid.', 422, [
                'to_number' => ['Destination number must be in E.164 format.'],
            ]);
        }

        $fromNumber = null;
        if (! empty($validated['from_number_id'])) {
            $fromNumber = FaxNumber::query()->find($validated['from_number_id']);
        }
        if (! $fromNumber) {
            $fromNumber = FaxNumber::query()
                ->where('is_active', true)
                ->where('is_default', true)
                ->first();
        }
        if (! $fromNumber) {
            $fromNumber = FaxNumber::query()->where('is_active', true)->first();
        }
        if (! $fromNumber) {
            return $this->error('No active fax number is available for this facility.', 409);
        }

        $manager = app(FaxManager::class);
        $disk = Storage::disk(config('fax.disk', 'local'));
        $path = $manager->storagePathFor((int) $facility->id, now());
        $disk->put($path, file_get_contents($validated['file']->getRealPath()));

        $fileBytes = $disk->get($path);

        $fax = new Fax([
            'direction' => Fax::DIRECTION_OUTBOUND,
            'provider' => $settings->provider,
            'from_number' => $fromNumber->e164_number,
            'to_number' => $toNumber,
            'from_number_id' => $fromNumber->id,
            'contact_id' => $contact?->id,
            'resident_id' => $validated['resident_id'] ?? null,
            'fax_type' => $validated['fax_type'],
            'subject' => $validated['subject'] ?? null,
            'file_path' => $path,
            'file_hash' => $fileBytes ? hash('sha256', $fileBytes) : null,
            'mime_type' => 'application/pdf',
            'status' => Fax::STATUS_QUEUED,
            'cover_page_html' => $validated['cover_page_html'] ?? null,
            'sent_by_user_id' => $request->user()?->id,
            'is_phi' => true,
        ]);
        $fax->facility_id = (int) $facility->id;
        $fax->save();

        $manager->recordEvent($fax, 'queued', [
            'queued_by' => $request->user()?->id,
        ]);

        SendFaxJob::dispatch((int) $fax->id);

        return $this->success(
            $fax->load(['contact', 'resident', 'fromNumber']),
            'Fax queued for delivery.',
            202,
        );
    }

    /**
     * POST /api/v1/fax/{id}/retry
     * Re-queue a previously-failed fax.
     */
    public function retry(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.send')) {
            return $error;
        }

        $fax = Fax::find($id);
        if (! $fax) {
            return $this->error('Fax not found.', 404);
        }

        if ($fax->status !== Fax::STATUS_FAILED) {
            return $this->error('Only failed faxes can be retried.', 422);
        }

        $fax->status = Fax::STATUS_QUEUED;
        $fax->status_reason = null;
        $fax->retry_count = (int) $fax->retry_count + 1;
        $fax->save();

        app(FaxManager::class)->recordEvent($fax, 'retry', [
            'attempt' => $fax->retry_count,
            'user_id' => $request->user()?->id,
        ]);

        SendFaxJob::dispatch((int) $fax->id);

        return $this->success($fax->refresh(), 'Fax re-queued.', 202);
    }

    /**
     * GET /api/v1/fax/{id}/download
     * Stream the PDF and log a 'downloaded' event.
     */
    public function download(Request $request, $id): StreamedResponse|JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.view')) {
            return $error;
        }

        $fax = Fax::find($id);
        if (! $fax || ! $fax->file_path) {
            return $this->error('Fax PDF not found.', 404);
        }

        $disk = Storage::disk(config('fax.disk', 'local'));
        if (! $disk->exists($fax->file_path)) {
            return $this->error('Fax PDF not found on disk.', 404);
        }

        app(FaxManager::class)->recordEvent($fax, 'downloaded', [
            'user_id' => $request->user()?->id,
        ]);

        $filename = 'fax-'.$fax->id.'.pdf';

        return $disk->download($fax->file_path, $filename, [
            'Content-Type' => $fax->mime_type ?: 'application/pdf',
        ]);
    }

    /**
     * POST /api/v1/fax/{id}/attach-resident
     * Body: {resident_id}
     */
    public function attachResident(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.view')) {
            return $error;
        }

        try {
            $validated = $request->validate([
                'resident_id' => ['required', 'integer', 'exists:residents,id'],
            ]);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        $fax = Fax::find($id);
        if (! $fax) {
            return $this->error('Fax not found.', 404);
        }

        $fax->resident_id = (int) $validated['resident_id'];
        $fax->save();

        app(FaxManager::class)->recordEvent($fax, 'resident_attached', [
            'resident_id' => $fax->resident_id,
            'user_id' => $request->user()?->id,
        ]);

        return $this->success($fax->refresh()->load('resident'), 'Resident attached.');
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.delete')) {
            return $error;
        }

        $fax = Fax::find($id);
        if (! $fax) {
            return $this->error('Fax not found.', 404);
        }

        $fax->delete();

        return $this->success(null, 'Fax deleted.');
    }

    /**
     * GET /api/v1/fax/cost-summary?month=YYYY-MM
     * Returns aggregates of delivered outbound faxes within the month, broken
     * down by fax_type. Cost = sum(page_count * fax_settings.cost_per_page_cents).
     */
    public function costSummary(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.view')) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $monthRaw = (string) $request->get('month', now()->format('Y-m'));
        try {
            $month = Carbon::createFromFormat('Y-m', $monthRaw)->startOfMonth();
        } catch (\Throwable $e) {
            return $this->error('Invalid month. Expected YYYY-MM.', 422);
        }

        $start = $month->copy()->startOfMonth();
        $end = $month->copy()->endOfMonth();

        $settings = FaxSetting::withoutGlobalScopes()
            ->where('facility_id', $facility->id)
            ->first();
        $costPerPage = (int) ($settings->cost_per_page_cents ?? config('fax.defaults.cost_per_page_cents', 7));

        $rows = Fax::query()
            ->where('direction', Fax::DIRECTION_OUTBOUND)
            ->where('status', Fax::STATUS_DELIVERED)
            ->whereBetween('sent_at', [$start, $end])
            ->select([
                DB::raw('COALESCE(fax_type, \'unknown\') as fax_type'),
                DB::raw('COALESCE(SUM(page_count), 0) as pages'),
                DB::raw('COUNT(*) as fax_count'),
            ])
            ->groupBy('fax_type')
            ->get();

        $byType = [];
        $totalPages = 0;
        $totalFaxes = 0;
        foreach ((array) config('fax.types', []) as $key => $_label) {
            $byType[$key] = ['pages' => 0, 'cost_cents' => 0, 'count' => 0];
        }

        foreach ($rows as $row) {
            $key = $row->fax_type ?: 'unknown';
            $pages = (int) $row->pages;
            $count = (int) $row->fax_count;
            $cost = $pages * $costPerPage;

            if (! isset($byType[$key])) {
                $byType[$key] = ['pages' => 0, 'cost_cents' => 0, 'count' => 0];
            }

            $byType[$key]['pages'] += $pages;
            $byType[$key]['cost_cents'] += $cost;
            $byType[$key]['count'] += $count;
            $totalPages += $pages;
            $totalFaxes += $count;
        }

        return $this->success([
            'month' => $month->format('Y-m'),
            'page_count' => $totalPages,
            'fax_count' => $totalFaxes,
            'cost_cents' => $totalPages * $costPerPage,
            'cost_per_page_cents' => $costPerPage,
            'by_type' => $byType,
        ]);
    }
}
