<?php

namespace App\Mail;

use App\Models\PharmacyOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PharmacyOrderNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PharmacyOrder $order,
        public string $eventType // 'created', 'status_changed'
    ) {}

    public function envelope(): Envelope
    {
        $subject = match($this->eventType) {
            'created' => "New Pharmacy Order: {$this->order->order_number}",
            'status_changed' => "Pharmacy Order Status Updated: {$this->order->order_number}",
            default => "Pharmacy Order Update: {$this->order->order_number}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $total = number_format($this->order->total ?? 0, 2);
        $supplierName = $this->order->supplier?->name ?? 'Unknown Supplier';
        $branchName = $this->order->branch?->name ?? '';
        $statusLabels = [
            'draft' => 'Draft',
            'pending' => 'Pending',
            'confirmed' => 'Confirmed',
            'partially_received' => 'Partially Received',
            'received' => 'Received',
            'cancelled' => 'Cancelled',
        ];
        $statusLabel = $statusLabels[$this->order->status] ?? $this->order->status;
        
        return new Content(
            text: 'mail.pharmacy-order',
            with: [
                'orderNumber' => $this->order->order_number,
                'total' => $total,
                'supplierName' => $supplierName,
                'branchName' => $branchName,
                'status' => $statusLabel,
                'statusRaw' => $this->order->status,
                'eventType' => $this->eventType,
                'orderDate' => $this->order->order_date?->format('M d, Y') ?? 'TBD',
                'expectedDeliveryDate' => $this->order->expected_delivery_date?->format('M d, Y') ?? 'TBD',
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

