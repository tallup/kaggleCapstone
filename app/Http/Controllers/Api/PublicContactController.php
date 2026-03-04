<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ContactFormMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class PublicContactController extends Controller
{
    private const TO_EMAIL = 'support@homelogic360.com';

    /**
     * Handle contact form submission. Sends email via AWS SES to support@homelogic360.com.
     */
    public function submit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string|max:50',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:10000',
        ]);

        try {
            Mail::to(self::TO_EMAIL)->send(new ContactFormMail(
                name: $validated['name'],
                email: $validated['email'],
                phone: $validated['phone'] ?? null,
                subject: $validated['subject'],
                messageText: $validated['message'],
            ));
        } catch (\Throwable $e) {
            Log::error('Contact form send failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'We could not send your message. Please try again later or email us directly.',
            ], 500);
        }

        return response()->json([
            'message' => 'Thank you for your message. We will get back to you soon.',
        ], 200);
    }
}
