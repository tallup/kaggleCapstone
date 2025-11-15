<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CleaningTaskAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'cleaning_task_id',
        'user_id',
        'scheduled_date',
        'status',
        'notified_at',
        'acknowledged_at',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'notified_at' => 'datetime',
        'acknowledged_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(CleaningTask::class, 'cleaning_task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
