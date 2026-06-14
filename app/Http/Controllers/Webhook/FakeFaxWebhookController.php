<?php

namespace App\Http\Controllers\Webhook;

class FakeFaxWebhookController extends AbstractFaxWebhookController
{
    protected function providerKey(): string
    {
        return 'fake';
    }
}
