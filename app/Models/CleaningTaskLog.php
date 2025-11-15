<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CleaningTaskLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'cleaning_task_id',
        'cleaning_area_id',
        'branch_id',
        'scheduled_date',
        'shift_label',
        'status',
        'completed_by',
        'initials',
        'notes',
        'completed_at',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'completed_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(CleaningTask::class, 'cleaning_task_id');
    }

    public function area()
    {
        return $this->belongsTo(CleaningArea::class, 'cleaning_area_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
