<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
@php
    $primary = $primaryColor ?? '#1E3A5F';
    $secondary = $secondaryColor ?? '#86EFAC';
    $accent = $accentColor ?? '#FFFFFF';
    $tint = $headerTint ?? '#f4f7fb';
    $theadBg = $tableHeaderBg ?? '#f1f5f9';
    $infoHead = $infoHeaderBg ?? '#f8fafc';
    $legBg = $legendBg ?? '#f8fafc';
    $bBorder = $brandBorder ?? '#cbd5e1';
    $gBorder = $gridBorder ?? '#cbd5e1';
    $labelMuted = '#475569';
    $textBody = '#334155';
@endphp
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9px;
            color: {{ $textBody }};
            margin: 0;
            padding: 14px 16px 20px;
            background: #ffffff;
        }
        .identity-card {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid {{ $bBorder }};
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 14px;
        }
        .identity-card td {
            vertical-align: middle;
            padding: 12px 14px;
        }
        .logo-cell { width: 22%; text-align: center; }
        .center-cell { width: 56%; }
        .photo-cell { width: 22%; text-align: center; }
        .facility-logo {
            max-height: 56px;
            max-width: 150px;
            height: auto;
            width: auto;
        }
        .resident-photo {
            width: 72px;
            height: 72px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid {{ $secondary }};
        }
        .avatar-fallback {
            display: inline-block;
            width: 72px;
            height: 72px;
            line-height: 72px;
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            color: {{ $primary }};
            background: {{ $theadBg }};
            border-radius: 8px;
            border: 2px solid {{ $secondary }};
        }
        .doc-title {
            font-size: 17px;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: {{ $primary }};
            margin: 0 0 4px 0;
        }
        .facility-line {
            font-size: 10px;
            font-weight: bold;
            color: {{ $primary }};
            margin: 0 0 2px 0;
        }
        .meta-line {
            font-size: 8px;
            color: {{ $labelMuted }};
            margin: 0 0 2px 0;
            line-height: 1.35;
        }
        .period-pill {
            display: inline-block;
            margin-top: 6px;
            padding: 4px 10px;
            font-size: 8px;
            font-weight: bold;
            color: {{ $accent }};
            border-radius: 4px;
            border: 1px solid {{ $secondary }};
            background: {{ $primary }};
        }
        .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            border: 1px solid {{ $bBorder }};
            border-radius: 4px;
        }
        .info-grid td {
            padding: 8px 10px;
            vertical-align: top;
            font-size: 8px;
            line-height: 1.45;
            border-bottom: 1px solid {{ $gBorder }};
        }
        .info-grid tr:last-child td { border-bottom: none; }
        .info-grid .label {
            font-weight: bold;
            color: {{ $primary }};
            width: 88px;
        }
        .info-grid .clinical {
            font-size: 7.5px;
            color: {{ $textBody }};
        }
        .section-title {
            font-size: 11px;
            margin: 14px 0 8px 0;
            padding-bottom: 4px;
            color: {{ $primary }};
            border-bottom: 2px solid {{ $secondary }};
        }
        table.grid {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 10px;
            font-size: 6.5px;
        }
        table.grid thead th {
            background: {{ $theadBg }};
            color: {{ $primary }};
            font-weight: bold;
        }
        table.grid th, table.grid td {
            border: 1px solid {{ $gBorder }};
            padding: 3px 2px;
            text-align: center;
            word-wrap: break-word;
        }
        table.grid td.cell-taken {
            background: #dcfce7;
            color: #166534;
            font-weight: bold;
        }
        table.grid td.cell-not_taken {
            background: #fee2e2;
            color: #991b1b;
            font-weight: bold;
        }
        table.grid td.cell-inactive {
            background: #f1f5f9;
            color: #64748b;
        }
        table.grid th.time-col {
            width: 52px;
            text-align: left;
            font-size: 7px;
        }
        .med-title {
            font-weight: bold;
            font-size: 10px;
            margin-top: 10px;
            color: {{ $primary }};
        }
        .med-detail {
            font-size: 7px;
            margin: 2px 0;
            line-height: 1.35;
            color: {{ $labelMuted }};
        }
        .legend {
            font-size: 7px;
            margin: 12px 0;
            line-height: 1.45;
            padding: 8px 10px;
            background: {{ $legBg }};
            border: 1px solid {{ $bBorder }};
            border-left: 3px solid {{ $secondary }};
            border-radius: 4px;
            color: {{ $labelMuted }};
        }
        .prn-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        .prn-table thead th {
            background: {{ $theadBg }};
            color: {{ $primary }};
            font-size: 7px;
        }
        .prn-table th, .prn-table td {
            border: 1px solid {{ $gBorder }};
            padding: 4px;
            font-size: 7px;
        }
        .prn-table td.prn-taken {
            background: #dcfce7;
            color: #166534;
            font-weight: bold;
        }
        .prn-table td.prn-not_taken {
            background: #fee2e2;
            color: #991b1b;
            font-weight: bold;
        }
        .footer {
            margin-top: 14px;
            padding-top: 8px;
            font-size: 7px;
            color: {{ $labelMuted }};
            border-top: 1px solid {{ $bBorder }};
        }
        .muted { color: #94a3b8; font-size: 7px; }
    </style>
</head>
<body>

<table class="identity-card" style="background: {{ $tint }}; border-left: 4px solid {{ $primary }};">
    <tr>
        <td class="logo-cell">
            @if(!empty($facilityLogoDataUri))
                <img class="facility-logo" src="{{ $facilityLogoDataUri }}" alt="Facility logo"/>
            @else
                <span style="font-size:9px;font-weight:bold;color:{{ $primary }};">{{ \Illuminate\Support\Str::limit($facilityName, 24) }}</span>
            @endif
        </td>
        <td class="center-cell">
            <p class="doc-title">MEDICATION ADMINISTRATION LOG</p>
            <p class="facility-line">{{ $facilityName }}@if(!empty($branchName)) — {{ $branchName }}@endif</p>
            @if(!empty($facilityAddress))
                <p class="meta-line">{{ $facilityAddress }}</p>
            @endif
            @if(!empty($facilityPhone))
                <p class="meta-line">Phone: {{ $facilityPhone }}</p>
            @endif
            <span class="period-pill">Report: {{ $rangeLabel }}</span>
        </td>
        <td class="photo-cell">
            @if(!empty($residentPhotoDataUri))
                <img class="resident-photo" src="{{ $residentPhotoDataUri }}" alt="Resident photo"/>
            @else
                <span class="avatar-fallback">{{ $residentInitials ?? '?' }}</span>
            @endif
            <div style="margin-top:6px;font-size:8px;font-weight:bold;color:{{ $primary }};">{{ $residentName }}</div>
            @if(!empty($residentRoom))
                <div class="meta-line" style="margin-top:2px;">Room {{ $residentRoom }}</div>
            @endif
        </td>
    </tr>
</table>

<table class="info-grid">
    <tr>
        <td colspan="2" style="background: {{ $infoHead }}; border-bottom: 1px solid {{ $gBorder }};">
            <span style="font-size:9px;font-weight:bold;color:{{ $primary }};">Resident &amp; clinical summary</span>
        </td>
    </tr>
    <tr>
        <td class="label">DOB</td>
        <td>{{ $residentDob ?: '—' }}</td>
    </tr>
    <tr>
        <td class="label">Physician</td>
        <td>{{ $physician ?: '—' }}</td>
    </tr>
    <tr>
        <td class="label">Diagnosis</td>
        <td class="clinical">{{ $diagnosis }}</td>
    </tr>
    <tr>
        <td class="label">Allergies</td>
        <td>{{ $allergies }}</td>
    </tr>
    <tr>
        <td class="label">Diet</td>
        <td>{{ $diet }}</td>
    </tr>
</table>

<div class="section-title">Scheduled medications</div>
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
                    @php
                        $k = $d['date'];
                        $raw = $row['cells'][$k] ?? null;
                        if (is_array($raw)) {
                            $cText = $raw['text'] ?? '—';
                            $cTone = $raw['tone'] ?? 'not_taken';
                        } else {
                            $cText = $raw ?? '—';
                            $cTone = 'not_taken';
                        }
                    @endphp
                    <td class="cell-{{ $cTone }}">{{ $cText }}</td>
                @endforeach
            </tr>
        @endforeach
        </tbody>
    </table>
@empty
    <p class="muted">No scheduled medications with administration times in this period.</p>
@endforelse

<div class="section-title">PRN medications</div>
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
                @php $prnTone = $r['tone'] ?? 'not_taken'; @endphp
                <tr>
                    <td>{{ $r['date'] }}</td>
                    <td>{{ $r['time'] }}</td>
                    <td class="prn-{{ $prnTone }}">{{ $r['initials'] }}</td>
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
    <strong style="color: {{ $primary }};">Legend:</strong>
    <span style="display:inline-block;padding:1px 6px;background:#dcfce7;color:#166534;font-weight:bold;margin-right:6px;">Green</span>
    Dose given / completed (initials or ✓).
    <span style="display:inline-block;padding:1px 6px;background:#fee2e2;color:#991b1b;font-weight:bold;margin:0 6px 0 8px;">Red</span>
    Not given: missed, refused, no record (—), hospital (H+), or other.
    Gray cells are outside the medication start/end window.
    Codes: M = missed; R = refused; H+ = hospital; Rx = pharmacy confirm.
</div>

<div class="footer">
    Generated by Evergreen. Exported on {{ $exportedAt }}. This report is confidential; discard if not the intended recipient.
</div>
</body>
</html>
