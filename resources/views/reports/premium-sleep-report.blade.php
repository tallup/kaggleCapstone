@extends('reports.premium-base')

@section('content')
    <div class="section-header">Sleep Tracking Historical Log</div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Sleep Date</th>
                <th>Bed Time</th>
                <th>Wake Time</th>
                <th>Total Duration</th>
                <th>Quality Rating</th>
                <th>Restlessness</th>
                <th>Notes</th>
                <th style="width: 15%;">Recorded By</th>
            </tr>
        </thead>
        <tbody>
            @forelse($records as $record)
                <tr>
                    <td class="font-bold primary-text">
                        {{ Carbon\Carbon::parse($record['date'])->format('M d, Y') }}
                    </td>
                    <td>{{ $record['sleep_time'] }}</td>
                    <td>{{ $record['wake_time'] }}</td>
                    <td class="font-bold">{{ $record['duration'] }}</td>
                    <td>
                        <span class="pill" style="background: {{ $secondaryColor ?? '#86EFAC' }}; color: #065f46;">
                            {{ $record['quality'] }}
                        </span>
                    </td>
                    <td>{{ $record['restlessness'] }} episodes</td>
                    <td class="text-xs italic">{{ $record['notes'] ?: 'No notes recorded' }}</td>
                    <td class="text-xs">{{ $record['recorded_by'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">
                        No sleep records found for the selected period.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
@endsection
