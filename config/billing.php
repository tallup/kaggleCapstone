<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stripe Price → plan label (SaaS subscription for facilities)
    |--------------------------------------------------------------------------
    |
    | Map each recurring Price ID from the Stripe Dashboard to a short name for
    | the API and React billing page. Set env vars per environment.
    |
    */
    'plans' => array_filter([
        'starter' => [
            'price_id' => env('STRIPE_PRICE_STARTER'),
            'name' => 'Starter',
        ],
        'professional' => [
            'price_id' => env('STRIPE_PRICE_PROFESSIONAL'),
            'name' => 'Professional',
        ],
    ], fn (array $plan) => is_string($plan['price_id'] ?? null) && $plan['price_id'] !== ''),

];
