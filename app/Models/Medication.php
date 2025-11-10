<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;

class Medication extends Model
{
    use HasFactory, SoftDeletes, Loggable;

    protected $fillable = [
        'resident_id',
        'branch_id',
        'drug_id',
        'name',
        'instructions',
        'quantity',
        'diagnosis',
        'created_by',
        'prescription_date',
        'start_date',
        'end_date',
        'notes',
        'is_active',
        'time_1',
        'time_2',
        'time_3',
        'time_4',
    ];

    protected $casts = [
        'prescription_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'quantity' => 'string', // Keep as string since it can be "30 tablets" etc
        'is_active' => 'boolean',
        'time_1' => 'string',
        'time_2' => 'string',
        'time_3' => 'string',
        'time_4' => 'string',
    ];

    // Relationships
    public function resident()
    {
        return $this->belongsTo(Resident::class);
    }

    public function drug()
    {
        return $this->belongsTo(Drug::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function administrations()
    {
        return $this->hasMany(MedicationAdministration::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByResident($query, $residentId)
    {
        return $query->where('resident_id', $residentId);
    }

    // Accessors
    public function getInstructionDisplayAttribute()
    {
        $instructions = [
            't.i.d' => 'Thrice daily',
            'q.i.d' => 'Four times a day',
            'b.i.d' => 'Twice daily',
            'PRN' => 'As needed',
            'h.s' => 'Hour of sleep',
            'a.m' => 'Morning',
            'p.m' => 'Evening',
        ];

        return $instructions[$this->instructions] ?? $this->instructions;
    }

    // Accessors
    public function getNameAttribute()
    {
        // If name is null or empty, create a name from drug and resident
        if (empty($this->attributes['name'])) {
            $drugName = $this->drug ? $this->drug->name : 'Unknown Drug';
            $residentName = $this->resident ? $this->resident->name : 'Unknown Resident';
            return "{$drugName} - {$residentName}";
        }
        return $this->attributes['name'];
    }

    // Static method for instruction options
    public static function getInstructionOptions()
    {
        return [
            't.i.d' => 't.i.d — Thrice daily',
            'q.i.d' => 'q.i.d — Four times a day',
            'b.i.d' => 'b.i.d — Twice daily',
            'PRN' => 'PRN — As needed',
            'h.s' => 'h.s — Hour of sleep',
            'a.m' => 'a.m — Morning',
            'p.m' => 'p.m — Evening',
        ];
    }
}
