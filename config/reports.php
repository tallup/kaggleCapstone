<?php

return [

    /*
    |--------------------------------------------------------------------------
    | PDF rendering driver
    |--------------------------------------------------------------------------
    |
    | auto       — Use Chromium via Browsershot when a binary is found; otherwise DomPDF.
    | dompdf     — Always DomPDF (recommended on hosts without Chrome/Node).
    | browsershot — Always Browsershot (falls back to DomPDF on failure).
    |
    */
    'pdf_driver' => env('REPORTS_PDF_DRIVER', 'auto'),

    /*
    |--------------------------------------------------------------------------
    | MAR / medication log PDF — day columns per table segment
    |--------------------------------------------------------------------------
    |
    | Wide single-row calendars are clipped by PDF engines (~28 columns on A4
    | landscape). Split into multiple tables of at most this many days.
    |
    */
    'mar_pdf_days_per_segment' => (int) env('REPORTS_MAR_PDF_DAYS_PER_SEGMENT', 15),

];
