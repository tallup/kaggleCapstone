<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Loggable;

class SleepRecord extends Model
{
    use HasFactory, Loggable;

    protected $fillable = [
        'resident_id',
        'branch_id',
        'sleep_date',
        'date', // For backward compatibility with old schema
        'sleep_time',
        'wake_time',
        'total_sleep_hours',
        'sleep_quality',
        'restlessness_episodes',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'sleep_date' => 'date',
        'sleep_time' => 'string',
        'wake_time' => 'string',
        'total_sleep_hours' => 'decimal:2',
        'sleep_quality' => 'integer',
        'restlessness_episodes' => 'integer',
    ];

    // Relationships
    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopeByResident($query, $residentId)
    {
        return $query->where('resident_id', $residentId);
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('sleep_date', [$startDate, $endDate]);
    }

    // Accessors
    public function getSleepDurationAttribute()
    {
        return $this->total_sleep_hours . ' hours';
    }

    public function getSleepQualityTextAttribute()
    {
        if (!$this->sleep_quality) {
            return 'Not rated';
        }
        
        $qualityText = [
            1 => 'Very Poor',
            2 => 'Poor',
            3 => 'Fair',
            4 => 'Below Average',
            5 => 'Average',
            6 => 'Above Average',
            7 => 'Good',
            8 => 'Very Good',
            9 => 'Excellent',
            10 => 'Perfect',
        ];

        return $qualityText[$this->sleep_quality] ?? 'Unknown';
    }
}
