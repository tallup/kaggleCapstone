<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CleaningTask extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'cleaning_area_id',
        'title',
        'instructions',
        'frequency',
        'window_start',
        'window_end',
        'days_of_week',
        'is_required',
        'display_order',
        'estimated_minutes',
        'is_active',
    ];

    protected $casts = [
        'days_of_week' => 'array',
        'is_required' => 'boolean',
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'estimated_minutes' => 'integer',
        'window_start' => 'datetime:H:i',
        'window_end' => 'datetime:H:i',
    ];

    public function area()
    {
        return $this->belongsTo(CleaningArea::class, 'cleaning_area_id');
    }

    public function logs()
    {
        return $this->hasMany(CleaningTaskLog::class);
    }

    public function assignments()
    {
        return $this->hasMany(CleaningTaskAssignment::class);
    }

    public function isScheduledForDate(Carbon $date): bool
    {
        $frequency = $this->frequency ?? 'daily';
        $dayName = strtolower($date->format('l'));
        $days = collect($this->days_of_week ?? [])
            ->map(fn ($day) => strtolower($day))
            ->filter()
            ->values();

        if ($frequency === 'daily') {
            return true;
        }

        if ($frequency === 'weekly') {
            return $days->isEmpty() ? true : $days->contains($dayName);
        }

        if ($frequency === 'monthly') {
            if ($days->isNotEmpty()) {
                return $days->contains((string) $date->day) || $days->contains($dayName);
            }

            return $date->isSameDay((clone $date)->startOfMonth());
        }

        // Ad-hoc tasks always be available so staff can log when needed
        return true;
    }
}
