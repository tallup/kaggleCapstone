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
        @php
            $isLandscape = ($pdfOrientation ?? 'landscape') === 'landscape';
        @endphp
        @page {
            size: A4 {{ $isLandscape ? 'landscape' : 'portrait' }};
            margin: 0;
        }

        /* Branding */
        .primary-text { color: {{ $primaryColor ?? '#1E3A5F' }}; }
        .primary-bg { background-color: {{ $primaryColor ?? '#1E3A5F' }}; }
        .secondary-bg { background-color: {{ $secondaryColor ?? '#86EFAC' }}; }
        .secondary-border { border-color: {{ $secondaryColor ?? '#86EFAC' }}; }

        /* Component Classes */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid {{ $secondaryColor ?? '#86EFAC' }}; padding-bottom: 20px; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-6 { gap: 1.5rem; }
        .gap-4 { gap: 1rem; }
        .h-16 { height: 4rem; }
        .w-16 { width: 4rem; }
        .rounded-lg { border-radius: 0.5rem; }
        .font-bold { font-weight: 700; }
        .text-2xl { font-size: 1.5rem; }
        .text-lg { font-size: 1.125rem; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .text-gray-500 { color: #64748b; }
        .text-right { text-align: right; }
        
        /* Grid */
        .grid { display: block; width: 100%; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .grid::after { content: ""; display: table; clear: both; }
        .grid-col { float: left; width: 25%; box-sizing: border-box; padding: 0 10px; border-right: 1px solid #e2e8f0; }
        .grid-col:last-child { border-right: none; }
        
        /* Table */
        .med-table { width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e2e8f0; margin-bottom: 18px; border-radius: 8px; overflow: hidden; table-layout: fixed; }
        .med-table th { background: #f8fafc; padding: 6px 4px; color: #475569; border: 1px solid #e2e8f0; font-weight: 700; }
        .med-table td { padding: 6px 4px; border: 1px solid #e2e8f0; text-align: center; }
        .med-table .time-label { background: #ffffff; text-align: left; font-weight: 700; width: 72px; max-width: 72px; color: {{ $primaryColor ?? '#1E3A5F' }}; }
        .mar-segment-label { font-size: 10px; font-weight: 600; color: #64748b; margin: 0 0 8px 0; }

        .cell-taken { background-color: #f0fdf4; color: #15803d; font-weight: 700; }
        .cell-not_taken { background-color: #fef2f2; color: #b91c1c; }
        .cell-inactive { background-color: #f1f5f9; color: #94a3b8; }

        .pill { display: inline-block; padding: 6px 12px; background: {{ $primaryColor ?? '#1E3A5F' }}; color: #ffffff; border-radius: 6px; font-weight: 700; font-size: 12px; }
        .section-header { font-size: 16px; font-weight: 700; color: {{ $primaryColor ?? '#1E3A5F' }}; margin-bottom: 15px; border-left: 5px solid {{ $secondaryColor ?? '#86EFAC' }}; padding-left: 12px; }
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
                    {{ substr($facilityName, 0, 1) }}
                </div>
            @endif
            <div>
                <h1 class="text-2xl font-bold primary-text">Medication Administration Log</h1>
                <p class="text-lg font-bold">{{ $facilityName }} @if($branchName) — {{ $branchName }} @endif</p>
                <p class="text-sm text-gray-500">{{ $facilityAddress ?? 'Facility Address' }}</p>
            </div>
        </div>
        <div class="text-right">
            <div class="pill">
                Period: {{ $rangeLabel }}
            </div>
            <p class="text-xs text-gray-500" style="margin-top: 5px;">Exported: {{ $exportedAt }}</p>
            @if(!empty($outcomeFilterLabel))
                <p class="text-xs font-semibold" style="margin-top: 8px; max-width: 260px; margin-left: auto; color: #0369a1; line-height: 1.35;">{{ $outcomeFilterLabel }}</p>
            @endif
        </div>
    </div>

    <!-- Resident Info Card -->
    @if($includeResidentCard ?? true)
    <div class="grid">
        <div class="grid-col">
            <div class="flex items-center gap-4">
                @if(!empty($residentPhotoDataUri))
                    <img src="{{ $residentPhotoDataUri }}" style="height: 60px; width: 60px; border-radius: 8px; border: 2px solid {{ $secondaryColor ?? '#86EFAC' }}; object-fit: cover;" />
                @else
                    <div style="height: 60px; width: 60px; border-radius: 8px; border: 2px solid {{ $secondaryColor ?? '#86EFAC' }}; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-weight: bold; color: {{ $primaryColor ?? '#1E3A5F' }};">
                        {{ $residentInitials }}
                    </div>
                @endif
                <div>
                    <p class="text-xs font-bold text-gray-500">RESIDENT</p>
                    <p class="text-sm font-bold primary-text">{{ $residentName }}</p>
                    <p class="text-xs text-gray-500">Room: {{ $residentRoom ?? 'N/A' }}</p>
                </div>
            </div>
        </div>
        <div class="grid-col">
            <p class="text-xs font-bold text-gray-500">CLINICAL DETAILS</p>
            <p class="text-xs"><strong>DOB:</strong> {{ $residentDob }}</p>
            <p class="text-xs"><strong>Physician:</strong> {{ $physician }}</p>
        </div>
        <div class="grid-col" style="width: 50%;">
            <p class="text-xs font-bold text-gray-500">CONDITIONS & ALLERGIES</p>
            <p class="text-xs" style="margin-bottom: 2px;"><strong>Diagnosis:</strong> {{ $diagnosis }}</p>
            <p class="text-xs text-red-600"><strong>Allergies:</strong> {{ $allergies }}</p>
        </div>
    </div>
    @endif

    {{-- Prominent allergies banner: state surveyors want allergies to be unmissable on every MAR. --}}
    @if(!empty($hasAllergies))
    <div style="margin: 0 0 20px 0; padding: 10px 16px; background: #fef2f2; border: 1.5px solid #fecaca; border-left: 6px solid #b91c1c; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
        <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; text-align: center; background: #b91c1c; color: #ffffff; border-radius: 50%; font-weight: 700; font-size: 14px;">!</span>
        <div style="font-size: 11px; color: #7f1d1d;">
            <span style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;">Allergies:</span>
            <span style="font-weight: 600;">{{ $allergies }}</span>
        </div>
    </div>
    @endif

    {{-- Period totals strip: total scheduled vs given vs missed vs refused, plus compliance percent. --}}
    @if(!empty($doseSummary) && (int) ($doseSummary['total'] ?? 0) > 0)
    @php $ds = $doseSummary; @endphp
    <div style="margin: 0 0 18px 0; padding: 12px 16px; background: {{ $primaryColor ?? '#1E3A5F' }}; color: #ffffff; border-radius: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 18px; font-size: 11px;">
        <div>
            <span style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.75;">Period</span>
            <span style="margin-left: 6px; font-weight: 700;">{{ $rangeLabel }}</span>
        </div>
        <div style="opacity: 0.5;">|</div>
        <div><span style="opacity: 0.75;">Recorded:</span> <span style="font-weight: 700;">{{ $ds['total'] }}</span></div>
        <div style="color: #bbf7d0;"><span style="opacity: 0.85;">Given:</span> <span style="font-weight: 700;">{{ $ds['given'] }}</span></div>
        <div style="color: #fecaca;"><span style="opacity: 0.85;">Missed:</span> <span style="font-weight: 700;">{{ $ds['missed'] }}</span></div>
        <div style="color: #fde68a;"><span style="opacity: 0.85;">Refused:</span> <span style="font-weight: 700;">{{ $ds['refused'] }}</span></div>
        @if(($ds['other'] ?? 0) > 0)
        <div style="color: #ddd6fe;"><span style="opacity: 0.85;">Other:</span> <span style="font-weight: 700;">{{ $ds['other'] }}</span></div>
        @endif
        <div style="margin-left: auto; padding: 4px 10px; background: rgba(255,255,255,0.16); border-radius: 999px; font-weight: 700;">
            Compliance: {{ $ds['compliance'] }}%
        </div>
    </div>
    @endif

    <!-- Medications Table -->
    @if($includeScheduledSection ?? true)
    <div>
        <div class="section-header">
            Scheduled Medications
        </div>
        
        @forelse($scheduledSections as $section)
            <div style="margin-bottom: 25px;">
                <div style="margin-bottom: 10px;">
                    <span class="text-lg font-bold primary-text">{{ $section['title'] }}</span>
                    <span class="text-sm text-gray-500 italic" style="margin-left: 10px;">{{ $section['strength'] }} {{ $section['form_line'] }}</span>
                    <div class="text-xs" style="color: #64748b; margin-top: 2px;">{{ $section['instructions'] }}</div>
                </div>
                
                @php
                    $marDayChunks = $dayChunks ?? (isset($days) ? [$days] : []);
                @endphp
                @foreach($marDayChunks as $chunk)
                    @if(count($marDayChunks) > 1)
                        <p class="mar-segment-label">
                            {{ $chunk[0]['short'] ?? '' }} — {{ $chunk[count($chunk) - 1]['short'] ?? '' }}
                        </p>
                    @endif
                    <table class="med-table">
                        <thead>
                            <tr>
                                <th class="time-label">Time</th>
                                @foreach($chunk as $day)
                                    <th>
                                        <div>{{ $day['dom'] }}</div>
                                        <div style="font-size: 7px;">{{ \Illuminate\Support\Str::beforeLast($day['short'] ?? '', ' ') ?: ($day['short'] ?? '') }}</div>
                                    </th>
                                @endforeach
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($section['rows'] as $row)
                                <tr>
                                    <td class="time-label">{{ $row['time_label'] }}</td>
                                    @foreach($chunk as $day)
                                        @php
                                            $cell = $row['cells'][$day['date']] ?? ['text' => '—', 'tone' => 'inactive'];
                                        @endphp
                                        <td class="cell-{{ $cell['tone'] }}">
                                            {{ $cell['text'] }}
                                        </td>
                                    @endforeach
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endforeach
            </div>
        @empty
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic;">No scheduled medications.</div>
        @endforelse
    </div>
    @endif

        @if(($includePrnSection ?? true) && count($prnSections) > 0)
        <div>
            <div class="section-header" style="border-color: #fb923c;">
                PRN (As Needed) Medications
            </div>
            <div style="display: table; width: 100%;">
                @foreach($prnSections as $prn)
                <div style="display: table-cell; width: 48%; padding-right: 2%; vertical-align: top;">
                    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                        <div style="background: #fff7ed; padding: 10px; border-bottom: 1px solid #fed7aa;">
                            <span style="font-weight: bold; color: #9a3412;">{{ $prn['title'] }}</span>
                            <div style="font-size: 10px; color: #c2410c;">{{ $prn['instructions'] }}</div>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                            <thead>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <th style="text-align: left; padding: 5px;">Date/Time</th>
                                    <th style="text-align: center; padding: 5px;">Init.</th>
                                    @if($includePrnAdminNotes ?? true)
                                    <th style="text-align: left; padding: 5px;">Notes</th>
                                    @endif
                                </tr>
                            </thead>
                            <tbody>
                                @forelse($prn['rows'] as $r)
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 5px;">{{ $r['date'] }} <span style="color: #94a3b8;">{{ $r['time'] }}</span></td>
                                    <td style="padding: 5px; text-align: center; font-weight: bold; color: #16a34a;">{{ $r['initials'] }}</td>
                                    @if($includePrnAdminNotes ?? true)
                                    <td style="padding: 5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">{{ $r['notes'] }}</td>
                                    @endif
                                </tr>
                                @empty
                                <tr><td colspan="{{ ($includePrnAdminNotes ?? true) ? 3 : 2 }}" style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">No PRN administrations.</td></tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>
                @endforeach
            </div>
        </div>
        @endif

    {{-- Caregiver initials key: lets a surveyor map "JD" back to "Jane Doe (Caregiver)". --}}
    @if(!empty($caregiverKey) && count($caregiverKey) > 0)
    <div style="margin-top: 28px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: {{ $primaryColor ?? '#1E3A5F' }}; text-transform: uppercase; letter-spacing: 0.5px;">
            Caregivers on this period
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tbody>
                @foreach(array_chunk($caregiverKey, 3) as $row)
                <tr>
                    @foreach($row as $cg)
                    <td style="width: 33.33%; padding: 4px 8px; vertical-align: top;">
                        <span style="display: inline-block; min-width: 26px; padding: 2px 6px; background: #ecfdf5; color: #15803d; border-radius: 4px; font-weight: 700; text-align: center;">{{ $cg['initials'] }}</span>
                        <span style="margin-left: 6px; font-weight: 600; color: #334155;">{{ $cg['name'] }}</span>
                        @if(!empty($cg['role']))
                        <span style="color: #64748b;"> &middot; {{ $cg['role'] }}</span>
                        @endif
                    </td>
                    @endforeach
                    @for($i = count($row); $i < 3; $i++)
                    <td style="width: 33.33%;"></td>
                    @endfor
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    {{-- Administrator review signature: physical sign-off when the report is printed for audits. --}}
    <div style="margin-top: 24px; padding: 14px 16px; border: 1px dashed #cbd5e1; border-radius: 10px; font-size: 10px; color: #475569;">
        <p style="margin: 0 0 12px 0; font-weight: 700; color: {{ $primaryColor ?? '#1E3A5F' }}; text-transform: uppercase; letter-spacing: 0.5px;">Administrator review</p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 60%; padding-right: 16px; vertical-align: bottom;">
                    <div style="border-bottom: 1px solid #94a3b8; height: 22px;"></div>
                    <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">Reviewed by (print &amp; sign)</p>
                </td>
                <td style="width: 40%; vertical-align: bottom;">
                    <div style="border-bottom: 1px solid #94a3b8; height: 22px;"></div>
                    <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">Date</p>
                </td>
            </tr>
        </table>
    </div>

    <!-- Footer Legend -->
    @if($includeLegend ?? true)
    <div style="margin-top: 28px; padding: 15px; background: {{ $primaryColor ?? '#1E3A5F' }}; color: #ffffff; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
        <div style="display: flex; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #4ade80; border-radius: 2px;"></span>
                Given
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #f87171; border-radius: 2px;"></span>
                Missed
            </div>
        </div>
        <div style="opacity: 0.6;">
            Powered by HomeLogic360 | Secure Clinical Reporting
        </div>
    </div>
    @endif
</body>
</html>
