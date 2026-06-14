<?php

namespace App\Mail;

use App\Models\ExpenseCategory;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ExpenseCategoryNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ExpenseCategory $category,
        public string $eventType // 'created', 'updated', 'deleted'
    ) {}

    public function envelope(): Envelope
    {
        $categoryName = $this->category->name ?? 'Category';
        
        $subject = match($this->eventType) {
            'created' => "New Expense Category Created: {$categoryName}",
            'updated' => "Expense Category Updated: {$categoryName}",
            'deleted' => "Expense Category Deleted: {$categoryName}",
            default => "Expense Category Update: {$categoryName}",
        };
        
        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $categoryName = $this->category->name ?? 'Category';
        $categoryType = $this->category->type ?? 'General';
        $description = $this->category->description ?? 'No description';
        
        return new Content(
            text: 'mail.expense-category',
            with: [
                'categoryName' => $categoryName,
                'categoryType' => $categoryType,
                'description' => $description,
                'eventType' => $this->eventType,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}

