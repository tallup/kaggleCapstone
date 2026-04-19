@extends('reports.premium-base')

@section('content')
    <div class="section-header">Active Medications & Administration Overview</div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Resident</th>
                <th>Medication</th>
                <th>Dosage / Strength</th>
                <th>Frequency</th>
                <th>Start Date</th>
                <th>Status</th>
                <th>Last Administered</th>
            </tr>
        </thead>
        <tbody>
            @foreach($medications as $med)
                <tr>
                    <td class="font-bold primary-text">{{ $med['resident_name'] }}</td>
                    <td class="font-bold">{{ $med['medication_name'] }}</td>
                    <td>{{ $med['dosage'] }} / {{ $med['strength'] }}</td>
                    <td>{{ $med['frequency'] }}</td>
                    <td>{{ $med['start_date'] }}</td>
                    <td>
                        <span class="badge {{ $med['status'] === 'Active' ? 'badge-success' : 'badge-warning' }}">
                            {{ $med['status'] }}
                        </span>
                    </td>
                    <td>{{ $med['last_administered'] }}<br><small class="text-gray-500">by {{ $med['administered_by'] }}</small></td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
