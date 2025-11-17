<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\Loggable;

class LeaveRequest extends Model
{
    use HasFactory, Loggable;

    protected $fillable = [
        'staff_id',
        'branch_id',
        'start_date',
        'end_date',
        'leave_type',
        'reason',
        'status',
        'decline_reason',
        'approved_by',
        'approved_at'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'approved_at' => 'datetime'
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    // Calculate leave duration in days
    public function getDurationAttribute(): int
    {
        return $this->start_date->diffInDays($this->end_date) + 1;
    }

    // Check if request is pending
    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'pending';
    }

    // Check if request is approved
    public function getIsApprovedAttribute(): bool
    {
        return $this->status === 'approved';
    }

    // Check if request is declined
    public function getIsDeclinedAttribute(): bool
    {
        return $this->status === 'declined';
    }

    // Get status badge color
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'warning',
            'approved' => 'success',
            'declined' => 'danger',
            default => 'gray',
        };
    }

    // Get status display name
    public function getStatusDisplayAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'approved' => 'Approved',
            'declined' => 'Declined',
            default => ucfirst($this->status),
        };
    }

    // Scope for pending requests
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    // Scope for approved requests
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    // Scope for declined requests
    public function scopeDeclined($query)
    {
        return $query->where('status', 'declined');
    }

    // Scope for current user's requests
    public function scopeForStaff($query, $staffId)
    {
        return $query->where('staff_id', $staffId);
    }
}
