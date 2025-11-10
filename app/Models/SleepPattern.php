<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SleepPattern extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'branch_id',
        'date',
        'month',
        'year',
        'total_sleep_hours',
        'total_awake_hours',
        'avg_sleep_hours',
        'days_with_records',
        'common_sleep_time',
        'common_wake_time',
        'sleep_quality_score',
        'key_observations',
        'bedtime',
        'wake_time',
        'sleep_interruptions',
        'notes',
    ];

    protected $casts = [
        'total_sleep_hours' => 'decimal:2',
        'total_awake_hours' => 'decimal:2',
        'avg_sleep_hours' => 'decimal:2',
        'days_with_records' => 'integer',
        'common_sleep_time' => 'string',
        'common_wake_time' => 'string',
        'sleep_quality_score' => 'integer',
    ];

    // Relationships
    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function hourlyData()
    {
        return $this->hasOne(SleepHourlyData::class);
    }

    // Scopes
    public function scopeByResident($query, $residentId)
    {
        return $query->where('resident_id', $residentId);
    }

    public function scopeByMonthYear($query, $month, $year)
    {
        return $query->where('month', $month)->where('year', $year);
    }

    // Accessors
    public function getMonthNameAttribute()
    {
        $months = [
            1 => 'January', 2 => 'February', 3 => 'March', 4 => 'April',
            5 => 'May', 6 => 'June', 7 => 'July', 8 => 'August',
            9 => 'September', 10 => 'October', 11 => 'November', 12 => 'December'
        ];
        return $months[$this->month] ?? 'Unknown';
    }

    public function getPeriodAttribute()
    {
        return $this->month_name . ' ' . $this->year;
    }
}
