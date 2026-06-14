<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use HasFactory, SoftDeletes, Loggable;

    protected $fillable = [
        'title',
        'resident_id',
        'branch_id',
        'appointment_type_id',
        'healthcare_provider_id',
        'appointment_date',
        'appointment_time',
        'original_appointment_date',
        'original_appointment_time',
        'reschedule_reason',
        'provider_name',
        'location',
        'description',
        'status',
        'next_appointment_date',
        'recurrence_pattern',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'appointment_time' => 'string', // Time column returns as string "HH:mm:ss"
        'original_appointment_date' => 'date',
        'original_appointment_time' => 'string',
        'next_appointment_date' => 'date',
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

    public function appointmentType()
    {
        return $this->belongsTo(AppointmentType::class);
    }

    public function healthcareProvider()
    {
        return $this->belongsTo(HealthcareProvider::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ResidentDocument::class);
    }

    // Scopes
    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeByResident($query, $residentId)
    {
        return $query->where('resident_id', $residentId);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('appointment_date', '>=', now()->toDateString());
    }

    public function scopePast($query)
    {
        return $query->where('appointment_date', '<', now()->toDateString());
    }

    // Accessors
    public function getFormattedDateTimeAttribute()
    {
        $date = $this->appointment_date->format('M j, Y');
        $time = $this->appointment_time ? $this->appointment_time->format('g:i A') : '';
        
        return $time ? "{$date} at {$time}" : $date;
    }

    public function getStatusColorAttribute()
    {
        return match ($this->status) {
            'scheduled' => 'gray',
            'confirmed' => 'blue',
            'in_progress' => 'yellow',
            'completed' => 'green',
            'cancelled' => 'red',
            'no_show' => 'orange',
            'rescheduled' => 'purple',
            default => 'gray',
        };
    }
}
