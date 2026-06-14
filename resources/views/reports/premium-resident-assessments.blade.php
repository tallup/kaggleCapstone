@extends('reports.premium-base')

@section('content')
    <p class="text-sm text-gray-500 mb-4">
        <strong>Resident:</strong> {{ $residentName }}
        @if($roomNumber ?? null) · <strong>Room:</strong> {{ $roomNumber }} @endif
        @if($dateOfBirth ?? null) · <strong>DOB:</strong> {{ $dateOfBirth }} @endif
    </p>

    <div class="section-header">Assessment summary</div>
    <p class="text-xs text-gray-500 mb-3">Listing assessment records only (not full questionnaire detail). JSON fields are abbreviated.</p>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Type</th>
                <th>Assessment date</th>
                <th>Status</th>
                <th>Assessor</th>
                <th style="width: 28%;">Notes</th>
                <th style="width: 28%;">Scores / recommendations (summary)</th>
            </tr>
        </thead>
        <tbody>
            @forelse($assessments as $row)
                <tr>
                    <td class="font-bold primary-text text-xs">{{ $row['type'] }}</td>
                    <td class="text-xs">{{ $row['date'] }}</td>
                    <td class="text-xs">{{ $row['status'] }}</td>
                    <td class="text-xs">{{ $row['assessor'] }}</td>
                    <td class="text-xs">{{ $row['notes'] }}</td>
                    <td class="text-xs">{{ $row['summary'] }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
                        No assessments found for this resident in the selected period.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
@endsection
