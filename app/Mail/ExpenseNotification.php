<?php

namespace App\Mail;

use App\Models\Expense;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Carbon\Carbon;

class ExpenseNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Expense $expense,
        public string $eventType // 'created', 'paid', 'deleted'
    ) {}

    public function envelope(): Envelope
    {
        $amount = number_format($this->expense->amount, 2);
        $categoryName = $this->expense->category?->name ?? 'Unknown Category';
        
        $subject = match($this->eventType) {
            'created' => "New Expense: \${$amount} - {$categoryName}",
            'paid' => "Expense Paid: \${$amount} - {$categoryName}",
            'deleted' => "Expense Deleted: \${$amount} - {$categoryName}",
            default => "Expense Update: \${$amount} - {$categoryName}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $amount = number_format($this->expense->amount, 2);
        $categoryName = $this->expense->category?->name ?? 'Unknown Category';
        $branchName = $this->expense->branch?->name ?? '';
        $expenseDate = $this->expense->expense_date ? Carbon::parse($this->expense->expense_date)->format('M d, Y') : 'TBD';
        $paymentDate = $this->expense->payment_date ? Carbon::parse($this->expense->payment_date)->format('M d, Y') : null;
        $paymentMethod = $this->expense->payment_method ? ucfirst($this->expense->payment_method) : null;
        $createdByName = $this->expense->createdBy 
            ? trim(($this->expense->createdBy->first_name ?? '') . ' ' . ($this->expense->createdBy->last_name ?? ''))
            : 'Staff';
        
        return new Content(
            text: 'mail.expense',
            with: [
                'amount' => $amount,
                'description' => $this->expense->description,
                'categoryName' => $categoryName,
                'branchName' => $branchName,
                'expenseDate' => $expenseDate,
                'paymentDate' => $paymentDate,
                'paymentMethod' => $paymentMethod,
                'paymentStatus' => $this->expense->payment_status,
                'eventType' => $this->eventType,
                'createdByName' => $createdByName,
                'notes' => $this->expense->notes,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

