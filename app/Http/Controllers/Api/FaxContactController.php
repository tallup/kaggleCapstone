<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Models\FaxContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FaxContactController extends BaseApiController
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

        $query = FaxContact::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->get('search'));
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('organization', 'like', $like)
                    ->orWhere('fax_e164', 'like', $like);
            });
        }

        if ($request->filled('type')) {
            $query->where('contact_type', $request->get('type'));
        }

        if ($request->has('active')) {
            $query->where('is_active', filter_var($request->get('active'), FILTER_VALIDATE_BOOLEAN));
        }

        $query->orderBy('name');

        return $this->paginate($request, $query, 50);
    }

    public function show(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.view')) {
            return $error;
        }

        $contact = FaxContact::find($id);
        if (! $contact) {
            return $this->error('Contact not found.', 404);
        }

        return $this->success($contact);
    }

    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_contacts')) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        try {
            $validated = $this->validatePayload($request, false);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        $validated['facility_id'] = (int) $facility->id;
        $validated['created_by'] = $request->user()?->id;
        $validated['is_active'] = $validated['is_active'] ?? true;

        $contact = new FaxContact($validated);
        $contact->facility_id = (int) $facility->id;
        $contact->save();

        return $this->success($contact, 'Contact created.', 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_contacts')) {
            return $error;
        }

        $contact = FaxContact::find($id);
        if (! $contact) {
            return $this->error('Contact not found.', 404);
        }

        try {
            $validated = $this->validatePayload($request, true);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        $contact->fill($validated)->save();

        return $this->success($contact->refresh(), 'Contact updated.');
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_contacts')) {
            return $error;
        }

        $contact = FaxContact::find($id);
        if (! $contact) {
            return $this->error('Contact not found.', 404);
        }

        $contact->delete();

        return $this->success(null, 'Contact deleted.');
    }

    /**
     * Common validation for store/update. `partial` controls "sometimes"
     * semantics for PATCH-style updates.
     */
    private function validatePayload(Request $request, bool $partial): array
    {
        $sometimes = $partial ? 'sometimes|' : '';
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => $required.'|string|max:255',
            'organization' => $sometimes.'nullable|string|max:255',
            'fax_e164' => [$required, 'string', 'max:24', 'regex:'.self::E164_REGEX],
            'phone' => $sometimes.'nullable|string|max:24',
            'email' => $sometimes.'nullable|email|max:255',
            'address' => $sometimes.'nullable|string|max:255',
            'contact_type' => [$sometimes ? 'sometimes' : 'nullable', 'string', Rule::in(array_keys(FaxContact::TYPES))],
            'notes' => $sometimes.'nullable|string',
            'is_active' => $sometimes.'boolean',
        ], [
            'fax_e164.regex' => 'Fax number must be in E.164 format (e.g. +14255550100).',
        ]);
    }
}
