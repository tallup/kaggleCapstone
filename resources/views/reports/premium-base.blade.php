<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        /* Modern Base Styles */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            -webkit-print-color-adjust: exact;
            background: #ffffff;
            margin: 0;
            padding: 30px;
        }
        @page {
            size: {{ $pageSize ?? 'A4' }} {{ $orientation ?? 'portrait' }};
            margin: 0;
        }

        /* Branding */
        .primary-text { color: {{ $primaryColor ?? '#1E3A5F' }}; }
        .primary-bg { background-color: {{ $primaryColor ?? '#1E3A5F' }}; }
        .secondary-bg { background-color: {{ $secondaryColor ?? '#86EFAC' }}; }
        .secondary-border { border-color: {{ $secondaryColor ?? '#86EFAC' }}; }

        /* Component Classes */
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 30px; 
            border-bottom: 2px solid {{ $secondaryColor ?? '#86EFAC' }}; 
            padding-bottom: 20px; 
        }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-6 { gap: 1.5rem; }
        .gap-4 { gap: 1rem; }
        .h-16 { height: 4rem; }
        .w-16 { width: 4rem; }
        .rounded-lg { border-radius: 0.5rem; }
        .font-bold { font-weight: 700; }
        .text-2xl { font-size: 1.5rem; }
        .text-xl { font-size: 1.25rem; }
        .text-lg { font-size: 1.125rem; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .text-gray-500 { color: #64748b; }
        .text-right { text-align: right; }
        .mt-2 { margin-top: 0.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        
        /* Table */
        .premium-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 11px; 
            border: 1px solid #e2e8f0; 
            margin-bottom: 25px; 
            border-radius: 8px; 
            overflow: hidden; 
        }
        .premium-table th { 
            background: #f8fafc; 
            padding: 12px 10px; 
            color: #475569; 
            border: 1px solid #e2e8f0; 
            font-weight: 700; 
            text-align: left;
        }
        .premium-table td { 
            padding: 10px; 
            border: 1px solid #e2e8f0; 
        }
        .premium-table tr:nth-child(even) {
            background-color: #fcfdfe;
        }

        .pill { 
            display: inline-block; 
            padding: 6px 12px; 
            background: {{ $primaryColor ?? '#1E3A5F' }}; 
            color: #ffffff; 
            border-radius: 6px; 
            font-weight: 700; 
            font-size: 12px; 
        }
        .section-header { 
            font-size: 16px; 
            font-weight: 700; 
            color: {{ $primaryColor ?? '#1E3A5F' }}; 
            margin-bottom: 15px; 
            border-left: 5px solid {{ $secondaryColor ?? '#86EFAC' }}; 
            padding-left: 12px; 
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 600;
        }
        .badge-success { background-color: #f0fdf4; color: #166534; }
        .badge-warning { background-color: #fffbeb; color: #92400e; }
        .badge-danger { background-color: #fef2f2; color: #991b1b; }
        .badge-info { background-color: #eff6ff; color: #1e40af; }

        .footer {
            margin-top: 40px;
            padding: 15px;
            background: {{ $primaryColor ?? '#1E3A5F' }};
            color: #ffffff;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
        }
    </style>
</head>
<body class="bg-white">
    <!-- Header Section -->
    <div class="header">
        <div class="flex items-center gap-6">
            @if(!empty($facilityLogoDataUri))
                <img src="{{ $facilityLogoDataUri }}" class="h-16" />
            @else
                <div class="h-16 w-16 primary-bg rounded-lg flex items-center justify-center font-bold text-white text-2xl">
                    {{ substr($facilityName ?? 'E', 0, 1) }}
                </div>
            @endif
            <div>
                <h1 class="text-2xl font-bold primary-text">{{ $reportTitle ?? 'Report' }}</h1>
                <p class="text-lg font-bold">{{ $facilityName ?? 'Evergreen Care' }} @if($branchName ?? null)? — {{ $branchName }} @endif</p>
                <p class="text-sm text-gray-500">{{ $facilityAddress ?? '' }}</p>
            </div>
        </div>
        <div class="text-right">
            <div class="pill">
                @if($rangeLabel ?? null)
                    Period: {{ $rangeLabel }}
                @else
                    Date: {{ now()->format('M d, Y') }}
                @endif
            </div>
            <p class="text-xs text-gray-500" style="margin-top: 5px;">Exported: {{ $exportedAt ?? now()->format('M d, Y g:i A') }}</p>
        </div>
    </div>

    <!-- Main Content -->
    <div class="content">
        @yield('content')
    </div>

    <!-- Footer -->
    <div class="footer">
        <div style="opacity: 0.8;">
            {{ $facilityName ?? 'Evergreen Care' }} | Confidential Internal Document
        </div>
        <div style="opacity: 0.6;">
            Powered by HomeLogic360 | Secure Clinical Reporting
        </div>
    </div>
</body>
</html>
