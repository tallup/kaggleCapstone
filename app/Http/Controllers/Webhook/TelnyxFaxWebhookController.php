<?php

namespace App\Http\Controllers\Webhook;

class TelnyxFaxWebhookController extends AbstractFaxWebhookController
{
    protected function providerKey(): string
    {
        return 'telnyx';
    }
}
