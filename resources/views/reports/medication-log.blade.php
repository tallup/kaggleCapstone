<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #111; margin: 12px; }
        h1 { font-size: 16px; margin: 0 0 4px 0; }
        h2 { font-size: 11px; margin: 12px 0 6px 0; border-bottom: 1px solid #333; }
        .muted { color: #444; font-size: 8px; }
        .header-block { margin-bottom: 10px; }
        table.meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        table.meta td { vertical-align: top; padding: 2px 6px; }
        table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6px; }
        table.grid th, table.grid td { border: 1px solid #999; padding: 2px; text-align: center; font-size: 6px; word-wrap: break-word; }
        table.grid th.time-col { width: 52px; text-align: left; font-size: 7px; }
        .med-title { font-weight: bold; font-size: 10px; margin-top: 8px; }
        .med-detail { font-size: 7px; margin: 2px 0; line-height: 1.3; }
        .legend { font-size: 7px; margin: 10px 0; line-height: 1.35; }
        .prn-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .prn-table th, .prn-table td { border: 1px solid #999; padding: 3px; font-size: 7px; }
        .footer { margin-top: 12px; font-size: 7px; color: #555; }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
    <div class="header-block">
        <h1>MEDICATION LOG</h1>
        <div class="muted">{{ $facilityName }} @if(!empty($branchName)) — {{ $branchName }} @endif</div>
        @if(!empty($facilityAddress))
            <div class="muted">{{ $facilityAddress }}</div>
        @endif
        @if(!empty($facilityPhone))
            <div class="muted">Phone: {{ $facilityPhone }}</div>
        @endif
        <div class="muted" style="margin-top:4px;">{{ $rangeLabel }}</div>
    </div>

    <table class="meta">
        <tr>
            <td style="width:50%;">
                <strong>Resident:</strong> {{ $residentName }}<br/>
                <strong>DOB:</strong> {{ $residentDob ?: '—' }}<br/>
                <strong>Physician:</strong> {{ $physician ?: '______________________________' }}
            </td>
            <td style="width:50%;">
                <strong>Diagnosis:</strong> {{ $diagnosis }}<br/>
                <strong>Allergies:</strong> {{ $allergies }}<br/>
                <strong>Diet:</strong> {{ $diet }}
            </td>
        </tr>
    </table>

    <h2>Scheduled medications</h2>
    @forelse($scheduledSections as $section)
        <div class="med-title">{{ $section['title'] }}</div>
        <div class="med-detail">
            @if(!empty($section['strength'])){{ $section['strength'] }}@endif
            @if(!empty($section['form_line'])) &nbsp;|&nbsp; {{ $section['form_line'] }} @endif
        </div>
        <div class="med-detail">
            @if(!empty($section['start_date'])){{ $section['start_date'] }}@endif
            @if(!empty($section['quantity'])) &nbsp;|&nbsp; {{ $section['quantity'] }} @endif
        </div>
        @if(!empty($section['instructions']))
            <div class="med-detail"><strong>Frequency / instructions:</strong> {{ $section['instructions'] }}
                @if(!empty($section['instruction_display']) && $section['instruction_display'] !== $section['instructions'])
                    ({{ $section['instruction_display'] }})
                @endif
            </div>
        @endif
        @if(!empty($section['sig']))
            <div class="med-detail"><strong>Notes:</strong> {{ $section['sig'] }}</div>
        @endif
        @if(!empty($section['diagnosis']))
            <div class="med-detail"><strong>Diagnosis (medication):</strong> {{ $section['diagnosis'] }}</div>
        @endif

        <table class="grid">
            <thead>
            <tr>
                <th class="time-col">Time</th>
                @foreach($days as $d)
                    <th>{{ $d['short'] ?? $d['dom'] }}</th>
                @endforeach
            </tr>
            </thead>
            <tbody>
            @foreach($section['rows'] as $row)
                <tr>
                    <td class="time-col">{{ $row['time_label'] }}</td>
                    @foreach($days as $d)
                        @php $k = $d['date']; @endphp
                        <td>{{ $row['cells'][$k] ?? '—' }}</td>
                    @endforeach
                </tr>
            @endforeach
            </tbody>
        </table>
    @empty
        <p class="muted">No scheduled medications with administration times in this period.</p>
    @endforelse

    <h2>PRN medications</h2>
    @forelse($prnSections as $prn)
        <div class="med-title">{{ $prn['title'] }}</div>
        <div class="med-detail">
            @if(!empty($prn['strength'])) Strength: {{ $prn['strength'] }} @endif
            @if(!empty($prn['quantity'])) &nbsp;|&nbsp; Qty. {{ $prn['quantity'] }} @endif
        </div>
        @if(!empty($prn['instructions']))
            <div class="med-detail">{{ $prn['instructions'] }}</div>
        @endif
        @if(!empty($prn['sig']))
            <div class="med-detail">{{ $prn['sig'] }}</div>
        @endif

        @if(count($prn['rows']) > 0)
            <table class="prn-table">
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Initials / code</th>
                    <th>Notes</th>
                </tr>
                </thead>
                <tbody>
                @foreach($prn['rows'] as $r)
                    <tr>
                        <td>{{ $r['date'] }}</td>
                        <td>{{ $r['time'] }}</td>
                        <td>{{ $r['initials'] }}</td>
                        <td>{{ $r['notes'] ?? '' }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        @else
            <p class="muted">No administrations recorded in this date range.</p>
        @endif
    @empty
        <p class="muted">No PRN medications.</p>
    @endforelse

    <div class="legend">
        <strong>Legend (status codes):</strong>
        Initials = completed;
        M = missed;
        R = refused;
        H+ = hospital admission;
        Rx = pharmacy administration confirm;
        — = no matching administration for this scheduled time.
    </div>

    <div class="footer">
        Generated by Evergreen. Exported on {{ $exportedAt }}. This report is confidential; discard if not the intended recipient.
    </div>
</body>
</html>
