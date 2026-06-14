<?php

namespace App\Models;

use App\Models\Scopes\FacilityScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidentStatusEvent extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'resident_id',
        'branch_id',
        'facility_id',
        'status_type',
        'from_status',
        'to_status',
        'effective_at',
        'details',
        'created_by',
    ];

    protected $casts = [
        'effective_at' => 'datetime',
        'details' => 'array',
    ];

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
