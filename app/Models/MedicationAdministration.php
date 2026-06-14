<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\Loggable;

class MedicationAdministration extends Model
{
    use Loggable;
    protected $fillable = [
        'medication_id',
        'resident_id',
        'branch_id',
        'administered_by',
        'administered_at',
        'status',
        'notes',
        'dosage_given',
        'document_path',
    ];

    protected $casts = [
        'administered_at' => 'datetime',
    ];

    // Relationships
    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function administeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administered_by');
    }

    // Accessors
    public function getStatusDisplayAttribute(): string
    {
        return match($this->status) {
            'completed' => 'Completed',
            'missed' => 'Missed',
            'refused' => 'Refused',
            'hospital_admission' => 'Hospital Admission',
            'pharmacy_administration_confirm' => 'Pharmacy Administration Confirm',
            default => ucfirst($this->status),
        };
    }
}
