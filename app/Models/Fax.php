<?php

namespace App\Models;

use App\Models\Scopes\FacilityScope;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Fax extends Model
{
    use Loggable, SoftDeletes;

    public const DIRECTION_OUTBOUND = 'outbound';

    public const DIRECTION_INBOUND = 'inbound';

    public const STATUS_QUEUED = 'queued';

    public const STATUS_SENDING = 'sending';

    public const STATUS_SENT = 'sent';

    public const STATUS_DELIVERED = 'delivered';

    public const STATUS_FAILED = 'failed';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_READ = 'read';

    protected static function booted(): void
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $table = 'faxes';

    protected $fillable = [
        'facility_id',
        'direction',
        'provider',
        'provider_fax_id',
        'from_number',
        'to_number',
        'from_number_id',
        'contact_id',
        'resident_id',
        'fax_type',
        'subject',
        'page_count',
        'file_path',
        'file_hash',
        'mime_type',
        'status',
        'status_reason',
        'cover_page_html',
        'cost_cents',
        'sent_by_user_id',
        'sent_at',
        'received_at',
        'retry_count',
        'last_provider_event_at',
        'is_phi',
    ];

    protected $casts = [
        'page_count' => 'integer',
        'cost_cents' => 'integer',
        'retry_count' => 'integer',
        'sent_at' => 'datetime',
        'received_at' => 'datetime',
        'last_provider_event_at' => 'datetime',
        'is_phi' => 'boolean',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(FaxContact::class, 'contact_id')->withTrashed();
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class)->withTrashed();
    }

    public function fromNumber(): BelongsTo
    {
        return $this->belongsTo(FaxNumber::class, 'from_number_id')->withTrashed();
    }

    public function sentByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(FaxEvent::class)->orderBy('received_at');
    }

    public function scopeOutbound($query)
    {
        return $query->where('direction', self::DIRECTION_OUTBOUND);
    }

    public function scopeInbound($query)
    {
        return $query->where('direction', self::DIRECTION_INBOUND);
    }

    public function isOutbound(): bool
    {
        return $this->direction === self::DIRECTION_OUTBOUND;
    }

    public function isInbound(): bool
    {
        return $this->direction === self::DIRECTION_INBOUND;
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [
            self::STATUS_SENT,
            self::STATUS_DELIVERED,
            self::STATUS_FAILED,
            self::STATUS_RECEIVED,
            self::STATUS_READ,
        ], true);
    }
}
