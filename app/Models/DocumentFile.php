<?php

namespace App\Models;

use App\Models\Scopes\FacilityScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentFile extends Model
{
    protected $fillable = [
        'facility_id',
        'folder_id',
        'display_name',
        'storage_path',
        'original_filename',
        'mime_type',
        'size_bytes',
        'uploaded_by',
        'notes',
        'legacy_resident_document_id',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FacilityScope);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(DocumentFolder::class, 'folder_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
