<?php

namespace App\Models;

use App\Models\Scopes\FacilityScope;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FaxSetting extends Model
{
    use Loggable, SoftDeletes;

    protected static function booted(): void
    {
        static::addGlobalScope(new FacilityScope);

        // Always issue a webhook_secret on create so the per-facility inbound
        // webhook URL (/webhooks/fax/{provider}/{secret}) is unique and
        // unguessable. Rotated via the rotateWebhookSecret() helper.
        static::creating(function (FaxSetting $setting): void {
            if (empty($setting->webhook_secret)) {
                $setting->webhook_secret = self::generateWebhookSecret();
            }
        });
    }

    protected $fillable = [
        'facility_id',
        'provider',
        'provider_choice',
        'credentials',
        'default_from_number_id',
        'cost_per_page_cents',
        'max_file_mb',
        'retention_days',
        'cover_page_html',
        'webhook_secret',
        'is_active',
        'last_tested_at',
        'last_test_status',
        'last_test_message',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        // Credentials are encrypted at rest. NEVER return this attribute to
        // the API in plain text; surface a redacted view from the controller.
        'credentials' => 'encrypted:array',
        'cost_per_page_cents' => 'integer',
        'max_file_mb' => 'integer',
        'retention_days' => 'integer',
        'is_active' => 'boolean',
        'last_tested_at' => 'datetime',
    ];

    // Defended against accidental JSON serialization of secrets even if a
    // dev forgets to redact in a controller.
    protected $hidden = [
        'credentials',
        'webhook_secret',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function defaultFromNumber(): BelongsTo
    {
        return $this->belongsTo(FaxNumber::class, 'default_from_number_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function generateWebhookSecret(): string
    {
        return Str::random(48);
    }

    public function rotateWebhookSecret(): string
    {
        $this->webhook_secret = self::generateWebhookSecret();
        $this->save();

        return $this->webhook_secret;
    }

    public function isConfigured(): bool
    {
        return ! empty($this->provider) && ! empty($this->credentials);
    }

    public function isHealthy(): bool
    {
        return $this->isConfigured()
            && $this->is_active
            && $this->last_test_status === 'ok';
    }
}
