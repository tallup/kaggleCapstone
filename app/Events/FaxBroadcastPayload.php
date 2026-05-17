<?php

namespace App\Events;

use App\Models\Fax;

/**
 * Shared payload shape for fax.* broadcast events.
 *
 * Kept in one place so FaxStatusUpdated and FaxReceived stay in lockstep
 * with the React listener — adding a field on the wire is a one-line
 * change here.
 */
final class FaxBroadcastPayload
{
    /**
     * @return array<string, mixed>
     */
    public static function build(Fax $fax): array
    {
        $contact = $fax->relationLoaded('contact') ? $fax->contact : null;
        $resident = $fax->relationLoaded('resident') ? $fax->resident : null;

        return [
            'id' => $fax->id,
            'facility_id' => $fax->facility_id,
            'direction' => $fax->direction,
            'status' => $fax->status,
            'provider' => $fax->provider,
            'provider_fax_id' => $fax->provider_fax_id,
            'contact' => $contact ? [
                'id' => $contact->id,
                'name' => $contact->name,
                'organization' => $contact->organization,
            ] : null,
            'resident' => $resident ? [
                'id' => $resident->id,
                'name' => trim(($resident->first_name ?? '').' '.($resident->last_name ?? '')),
            ] : null,
            'to_number' => $fax->to_number,
            'from_number' => $fax->from_number,
            'fax_type' => $fax->fax_type,
            'subject' => $fax->subject,
            'page_count' => $fax->page_count,
            'sent_at' => optional($fax->sent_at)->toIso8601String(),
            'received_at' => optional($fax->received_at)->toIso8601String(),
            'updated_at' => optional($fax->updated_at)->toIso8601String(),
        ];
    }
}
