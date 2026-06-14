<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\FacilityScope;

class Shift extends Model
{
    use HasFactory;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'branch_id',
        'user_id',
        'start_at',
        'end_at',
        'shift_type',
        'notes',
        'is_published',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_published' => 'boolean',
    ];

    public const TYPE_REGULAR = 'regular';
    public const TYPE_MORNING = 'morning';
    public const TYPE_EVENING = 'evening';
    public const TYPE_NIGHT = 'night';

    public static function shiftTypes(): array
    {
        return [
            self::TYPE_REGULAR => 'Regular',
            self::TYPE_MORNING => 'Morning',
            self::TYPE_EVENING => 'Evening',
            self::TYPE_NIGHT => 'Night',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeInDateRange($query, $start, $end)
    {
        return $query->where(function ($q) use ($start, $end) {
            $q->whereBetween('start_at', [$start, $end])
                ->orWhereBetween('end_at', [$start, $end])
                ->orWhere(function ($q2) use ($start, $end) {
                    $q2->where('start_at', '<=', $start)->where('end_at', '>=', $end);
                });
        });
    }
}
