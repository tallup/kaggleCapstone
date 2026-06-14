<?php

namespace App\Mail;

use App\Models\GroceryStatusUpdate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class GroceryStatusNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public GroceryStatusUpdate $groceryStatus
    ) {}

    public function envelope(): Envelope
    {
        $itemName = $this->groceryStatus->item_name ?? 'Grocery Item';
        $status = ucfirst($this->groceryStatus->status ?? 'updated');
        
        return new Envelope(
            subject: "Grocery Status Updated: {$itemName} - {$status}",
        );
    }

    public function content(): Content
    {
        $itemName = $this->groceryStatus->item_name ?? 'Grocery Item';
        $status = ucfirst($this->groceryStatus->status ?? 'updated');
        $updatedByName = $this->groceryStatus->updatedBy 
            ? trim(($this->groceryStatus->updatedBy->first_name ?? '') . ' ' . ($this->groceryStatus->updatedBy->last_name ?? ''))
            : 'Staff';
        $updateDate = $this->groceryStatus->updated_at ? Carbon::parse($this->groceryStatus->updated_at)->format('M d, Y g:i A') : 'TBD';
        
        return new Content(
            text: 'mail.grocery-status',
            with: [
                'itemName' => $itemName,
                'status' => $status,
                'updatedByName' => $updatedByName,
                'updateDate' => $updateDate,
                'quantity' => $this->groceryStatus->quantity,
                'notes' => $this->groceryStatus->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

