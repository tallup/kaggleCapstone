<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Registered Providers
    |--------------------------------------------------------------------------
    |
    | All FaxProvider implementations registered with the application. Each
    | facility chooses which provider it uses via its FaxSetting row; the
    | actual credentials are stored encrypted on that row, NOT here.
    |
    | The order of this list controls the order shown in the Fax Settings
    | provider dropdown.
    |
    */
    'providers' => [
        \App\Services\Fax\Providers\TelnyxFaxProvider::class,
        \App\Services\Fax\Providers\DocumoFaxProvider::class,
        \App\Services\Fax\Providers\FakeFaxProvider::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    |
    | Disk used to persist fax PDFs. Files are stored at
    | "{disk}/faxes/{facility_id}/{yyyy}/{mm}/{uuid}.pdf" with a private
    | visibility. Downloads are issued through signed temporary URLs.
    |
    */
    'disk' => env('FAX_DISK', 'local'),
    'storage_path' => 'faxes',

    /*
    |--------------------------------------------------------------------------
    | Upload Limits
    |--------------------------------------------------------------------------
    */
    'max_file_mb' => (int) env('FAX_MAX_FILE_MB', 25),
    'allowed_mimes' => ['application/pdf'],

    /*
    |--------------------------------------------------------------------------
    | Defaults seeded into a new FaxSetting row
    |--------------------------------------------------------------------------
    */
    'defaults' => [
        'cost_per_page_cents' => 7,   // facilities override with their actual provider rate
        'max_file_mb' => 25,
        'retention_days' => 2555,     // ~7 years (HIPAA minimum)
    ],

    /*
    |--------------------------------------------------------------------------
    | Webhook
    |--------------------------------------------------------------------------
    |
    | Maximum clock skew (in seconds) tolerated when validating signed webhook
    | timestamps. Telnyx, Documo and most providers ship a timestamp header
    | alongside the signature to prevent replay attacks.
    |
    */
    'webhook_timestamp_tolerance' => 300,

    /*
    |--------------------------------------------------------------------------
    | Fax Types
    |--------------------------------------------------------------------------
    */
    'types' => [
        'refills' => 'Refill Request',
        'orders' => 'Doctor Orders',
        'records' => 'Medical Records',
    ],

    /*
    |--------------------------------------------------------------------------
    | Statuses
    |--------------------------------------------------------------------------
    */
    'statuses' => [
        'queued' => 'Queued',
        'sending' => 'Sending',
        'delivered' => 'Delivered',
        'failed' => 'Failed',
        'received' => 'Received',
        'read' => 'Read',
    ],
];
