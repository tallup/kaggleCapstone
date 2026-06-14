@extends('reports.premium-base')

@section('content')
    <div class="section-header">Appointment & Visit History</div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Date / Time</th>
                <th style="width: 25%;">Appointment Title</th>
                <th>Type</th>
                <th>Provider</th>
                <th>Location</th>
                <th>Status</th>
                <th style="width: 20%;">Clinical Notes</th>
            </tr>
        </thead>
        <tbody>
            @forelse($appointments as $appt)
                <tr>
                    <td class="font-bold primary-text">
                        {{ $appt['date'] }}
                        <div class="text-xs text-gray-500 font-normal">{{ $appt['time'] }}</div>
                    </td>
                    <td class="font-bold">{{ $appt['title'] }}</td>
                    <td>
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {{ $appt['type'] }}
                        </span>
                    </td>
                    <td>{{ $appt['provider'] }}</td>
                    <td class="text-xs">{{ $appt['location'] }}</td>
                    <td>
                        @php
                            $statusColor = match(strtolower($appt['status'])) {
                                'completed' => '#dcfce7',
                                'scheduled' => '#e0f2fe',
                                'cancelled' => '#fee2e2',
                                default => '#f3f4f6'
                            };
                            $textColor = match(strtolower($appt['status'])) {
                                'completed' => '#166534',
                                'scheduled' => '#075985',
                                'cancelled' => '#991b1b',
                                default => '#374151'
                            };
                        @endphp
                        <span class="pill" style="background: {{ $statusColor }}; color: {{ $textColor }};">
                            {{ $appt['status'] }}
                        </span>
                    </td>
                    <td class="text-xs italic">{{ $appt['notes'] ?: '—' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px; color: #94a3b8;">
                        No appointment history found for this resident.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
@endsection
