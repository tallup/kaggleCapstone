@extends('reports.premium-base')

@section('content')
    <p class="text-sm text-gray-500 mb-4">
        <strong>Resident:</strong> {{ $residentName }}
        @if($roomNumber ?? null) · <strong>Room:</strong> {{ $roomNumber }} @endif
        @if($dateOfBirth ?? null) · <strong>DOB:</strong> {{ $dateOfBirth }} @endif
    </p>

    <div class="section-header">Incident history (resident-linked)</div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Number</th>
                <th>Date / time</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Location</th>
                <th style="width: 18%;">Description</th>
                <th style="width: 12%;">Actions / follow-up</th>
                <th>Reported by</th>
                <th>Resolved</th>
            </tr>
        </thead>
        <tbody>
            @forelse($incidents as $row)
                <tr>
                    <td class="font-bold primary-text text-xs">{{ $row['number'] }}</td>
                    <td class="text-xs">{{ $row['datetime'] }}</td>
                    <td class="text-xs">{{ $row['type'] }}</td>
                    <td class="text-xs">{{ $row['severity'] }}</td>
                    <td class="text-xs">{{ $row['priority'] }}</td>
                    <td class="text-xs">{{ $row['status'] }}</td>
                    <td class="text-xs">{{ $row['location'] }}</td>
                    <td class="text-xs">{{ $row['description'] }}</td>
                    <td class="text-xs">
                        @if(($row['action_taken'] ?? '—') !== '—')
                            <strong>Action:</strong> {{ $row['action_taken'] }}<br/>
                        @endif
                        @if(($row['follow_up'] ?? '—') !== '—')
                            <strong>Follow-up:</strong> {{ $row['follow_up'] }}
                        @endif
                        @if(($row['action_taken'] ?? '—') === '—' && ($row['follow_up'] ?? '—') === '—')
                            —
                        @endif
                    </td>
                    <td class="text-xs">{{ $row['reported_by'] }}</td>
                    <td class="text-xs">{{ $row['resolved_at'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="11" style="text-align: center; padding: 30px; color: #94a3b8;">
                        No incidents found for this resident in the selected period.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
@endsection
