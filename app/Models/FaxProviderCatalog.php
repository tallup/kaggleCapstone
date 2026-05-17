<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Additional fax provider rows shown in the Fax Settings dropdown.
 *
 * Each entry is a display alias that maps to a built-in {@see \App\Services\Fax\Contracts\FaxProvider}
 * implementation (telnyx, documo, fake). Webhooks and persistence still use the canonical
 * provider key on {@see FaxSetting::$provider}.
 */
class FaxProviderCatalog extends Model
{
    protected $table = 'fax_provider_catalog';

    protected $fillable = [
        'slug',
        'canonical_provider',
        'display_name',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
