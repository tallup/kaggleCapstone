<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Drug extends Model
{
    protected $fillable = [
        'name',
        'generic_name',
        'description',
        'dosage_form',
        'strength',
        'indications',
        'contraindications',
        'side_effects',
        'storage_instructions',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relationships
    public function medications(): HasMany
    {
        return $this->hasMany(Medication::class);
    }

    public function pharmacyInventory(): HasMany
    {
        return $this->hasMany(PharmacyInventory::class);
    }

    // Accessors
    public function getDisplayNameAttribute(): string
    {
        return $this->name . ($this->generic_name ? " ({$this->generic_name})" : '');
    }

    public function getFullDescriptionAttribute(): string
    {
        $parts = [];
        if ($this->strength) $parts[] = $this->strength;
        if ($this->dosage_form) $parts[] = $this->dosage_form;
        return implode(' ', $parts);
    }
}
