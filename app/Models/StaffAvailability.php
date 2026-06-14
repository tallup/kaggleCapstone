<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\FacilityScope;

class StaffAvailability extends Model
{
    use HasFactory;

    protected $table = 'staff_availability';

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'user_id',
        'facility_id',
        'day_of_week',
        'date',
        'start_time',
        'end_time',
        'type',
    ];

    public const TYPE_AVAILABLE = 'available';
    public const TYPE_UNAVAILABLE = 'unavailable';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeRecurring($query)
    {
        return $query->whereNotNull('day_of_week');
    }

    public function scopeOneOff($query)
    {
        return $query->whereNotNull('date');
    }
}
