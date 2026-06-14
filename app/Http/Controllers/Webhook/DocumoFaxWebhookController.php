<?php

namespace App\Http\Controllers\Webhook;

class DocumoFaxWebhookController extends AbstractFaxWebhookController
{
    protected function providerKey(): string
    {
        return 'documo';
    }
}
