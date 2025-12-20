<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;
use App\Models\Scopes\FacilityScope;
use Carbon\Carbon;

class Incident extends Model
{
    use HasFactory, SoftDeletes, Loggable;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    // Constants for Status
    public const STATUS_OPEN = 'open';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_CLOSED = 'closed';
    public const STATUS_ON_HOLD = 'on_hold';

    // Constants for Priority
    public const PRIORITY_CRITICAL = 'critical';
    public const PRIORITY_HIGH = 'high';
    public const PRIORITY_MEDIUM = 'medium';
    public const PRIORITY_LOW = 'low';

    // Constants for Severity
    public const SEVERITY_CRITICAL = 'critical';
    public const SEVERITY_HIGH = 'high';
    public const SEVERITY_MEDIUM = 'medium';
    public const SEVERITY_LOW = 'low';

    // Common Incident Types
    public const TYPE_FALL = 'Fall';
    public const TYPE_MEDICATION_ERROR = 'Medication Error';
    public const TYPE_BEHAVIORAL = 'Behavioral Incident';
    public const TYPE_MEDICAL_EMERGENCY = 'Medical Emergency';
    public const TYPE_EQUIPMENT_MALFUNCTION = 'Equipment Malfunction';
    public const TYPE_SECURITY_BREACH = 'Security Breach';
    public const TYPE_FIRE_SAFETY = 'Fire/Safety';
    public const TYPE_FOOD_SAFETY = 'Food Safety';
    public const TYPE_INFECTION_CONTROL = 'Infection Control';
    public const TYPE_TRANSPORTATION = 'Transportation';
    public const TYPE_COMMUNICATION_ERROR = 'Communication Error';
    public const TYPE_ENVIRONMENTAL_HAZARD = 'Environmental Hazard';
    public const TYPE_STAFF_INJURY = 'Staff Injury';
    public const TYPE_RESIDENT_INJURY = 'Resident Injury';
    public const TYPE_PROPERTY_DAMAGE = 'Property Damage';

    protected $fillable = [
        'incident_number',
        'resident_id',
        'branch_id',
        'incident_type',
        'description',
        'incident_date',
        'location',
        'severity',
        'status',
        'priority',
        'action_taken',
        'witnesses',
        'follow_up',
        'reported_by',
        'assigned_to',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'incident_date' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($incident) {
            if (empty($incident->incident_number)) {
                $incident->incident_number = static::generateIncidentNumber();
            }
            if (empty($incident->status)) {
                $incident->status = self::STATUS_OPEN;
            }
            if (empty($incident->priority)) {
                $incident->priority = self::PRIORITY_MEDIUM;
            }
            if (empty($incident->severity)) {
                $incident->severity = self::SEVERITY_LOW;
            }
        });
    }

    /**
     * Generate unique incident number in format: INC-YYYY-NNNNN
     * Uses database locking to prevent race conditions
     */
    protected static function generateIncidentNumber(): string
    {
        $prefix = 'INC';
        $year = now()->format('Y');
        $maxAttempts = 10;
        $attempt = 0;
        
        while ($attempt < $maxAttempts) {
            // Use database transaction with locking to prevent race conditions
            $incidentNumber = \DB::transaction(function () use ($prefix, $year) {
                // Lock the table row to prevent concurrent access
                $lastIncident = static::withoutGlobalScopes()
                    ->where('incident_number', 'like', "{$prefix}-{$year}-%")
                    ->lockForUpdate()
                    ->orderBy('id', 'desc')
                    ->first();

                if ($lastIncident) {
                    $lastNumber = (int) substr($lastIncident->incident_number, -5);
                    $newNumber = $lastNumber + 1;
                } else {
                    $newNumber = 1;
                }

                return sprintf('%s-%s-%05d', $prefix, $year, $newNumber);
            });
            
            // Double-check if this incident number already exists
            $exists = static::withoutGlobalScopes()
                ->where('incident_number', $incidentNumber)
                ->exists();
            
            if (!$exists) {
                return $incidentNumber;
            }
            
            // If it exists, wait a bit and try again with next number
            $attempt++;
            usleep(50000 + (rand(0, 50000))); // Random wait between 50-100ms
        }
        
        // If we've exhausted all attempts, use timestamp-based fallback to ensure uniqueness
        return sprintf('%s-%s-%s-%s', $prefix, $year, now()->format('His'), rand(1000, 9999));
    }

    // Relationships
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(IncidentAttachment::class);
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

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    public function scopeByIncidentType($query, $type)
    {
        return $query->where('incident_type', $type);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('incident_date', [$startDate, $endDate]);
    }

    public function scopeOpen($query)
    {
        return $query->where('status', self::STATUS_OPEN);
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    public function scopeResolved($query)
    {
        return $query->where('status', self::STATUS_RESOLVED);
    }

    public function scopeClosed($query)
    {
        return $query->where('status', self::STATUS_CLOSED);
    }

    public function scopeCritical($query)
    {
        return $query->where('severity', self::SEVERITY_CRITICAL)
            ->orWhere('priority', self::PRIORITY_CRITICAL);
    }

    public function scopeHighPriority($query)
    {
        return $query->whereIn('priority', [self::PRIORITY_CRITICAL, self::PRIORITY_HIGH]);
    }

    // Accessors & Mutators
    public function getStatusOptions(): array
    {
        return [
            self::STATUS_OPEN => 'Open',
            self::STATUS_IN_PROGRESS => 'In Progress',
            self::STATUS_RESOLVED => 'Resolved',
            self::STATUS_CLOSED => 'Closed',
            self::STATUS_ON_HOLD => 'On Hold',
        ];
    }

    public function getPriorityOptions(): array
    {
        return [
            self::PRIORITY_CRITICAL => 'Critical',
            self::PRIORITY_HIGH => 'High',
            self::PRIORITY_MEDIUM => 'Medium',
            self::PRIORITY_LOW => 'Low',
        ];
    }

    public function getSeverityOptions(): array
    {
        return [
            self::SEVERITY_CRITICAL => 'Critical',
            self::SEVERITY_HIGH => 'High',
            self::SEVERITY_MEDIUM => 'Medium',
            self::SEVERITY_LOW => 'Low',
        ];
    }

    public function getIncidentTypeOptions(): array
    {
        return [
            self::TYPE_FALL => 'Fall',
            self::TYPE_MEDICATION_ERROR => 'Medication Error',
            self::TYPE_BEHAVIORAL => 'Behavioral Incident',
            self::TYPE_MEDICAL_EMERGENCY => 'Medical Emergency',
            self::TYPE_EQUIPMENT_MALFUNCTION => 'Equipment Malfunction',
            self::TYPE_SECURITY_BREACH => 'Security Breach',
            self::TYPE_FIRE_SAFETY => 'Fire/Safety',
            self::TYPE_FOOD_SAFETY => 'Food Safety',
            self::TYPE_INFECTION_CONTROL => 'Infection Control',
            self::TYPE_TRANSPORTATION => 'Transportation',
            self::TYPE_COMMUNICATION_ERROR => 'Communication Error',
            self::TYPE_ENVIRONMENTAL_HAZARD => 'Environmental Hazard',
            self::TYPE_STAFF_INJURY => 'Staff Injury',
            self::TYPE_RESIDENT_INJURY => 'Resident Injury',
            self::TYPE_PROPERTY_DAMAGE => 'Property Damage',
        ];
    }

    // Helper methods
    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function isResolved(): bool
    {
        return $this->status === self::STATUS_RESOLVED;
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }

    public function isCritical(): bool
    {
        return $this->severity === self::SEVERITY_CRITICAL || 
               $this->priority === self::PRIORITY_CRITICAL;
    }

    public function markAsResolved(User $user, ?string $notes = null): void
    {
        $this->update([
            'status' => self::STATUS_RESOLVED,
            'resolved_by' => $user->id,
            'resolved_at' => now(),
            'follow_up' => $notes ? ($this->follow_up ? $this->follow_up . "\n\nResolution: " . $notes : "Resolution: " . $notes) : $this->follow_up,
        ]);
    }

    public function markAsClosed(User $user, ?string $notes = null): void
    {
        $this->update([
            'status' => self::STATUS_CLOSED,
            'resolved_by' => $user->id,
            'resolved_at' => $this->resolved_at ?? now(),
            'follow_up' => $notes ? ($this->follow_up ? $this->follow_up . "\n\nClosed: " . $notes : "Closed: " . $notes) : $this->follow_up,
        ]);
    }
}
