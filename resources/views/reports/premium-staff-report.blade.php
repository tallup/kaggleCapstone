@extends('reports.premium-base')

@section('content')
    <div class="section-header">Staff Performance & Activity Report</div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Staff Member</th>
                <th>Email</th>
                <th>Vitals Recorded</th>
                <th>Assessments</th>
                <th>Total Activities</th>
                <th>Performance Score</th>
            </tr>
        </thead>
        <tbody>
            @foreach($staff as $member)
                <tr>
                    <td class="font-bold primary-text">{{ $member['name'] }}</td>
                    <td>{{ $member['email'] }}</td>
                    <td>{{ $member['vitals_recorded'] }}</td>
                    <td>{{ $member['assessments_completed'] }}</td>
                    <td class="font-bold">{{ $member['total_activities'] }}</td>
                    <td>
                        @php
                            $score = floatval($member['performance_score']);
                            $scoreClass = $score >= 80 ? 'badge-success' : ($score >= 50 ? 'badge-info' : 'badge-warning');
                        @endphp
                        <span class="badge {{ $scoreClass }}">
                            {{ $member['performance_score'] }}%
                        </span>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
