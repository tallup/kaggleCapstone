@extends('reports.premium-base')

@section('content')
    <div class="section-header">Resident Directory & Health Summary</div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Resident Name</th>
                <th>Room</th>
                <th>Branch</th>
                <th>Admission Date</th>
                <th>Status</th>
                <th>Last Vitals</th>
                <th>Health Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($residents as $resident)
                <tr>
                    <td class="font-bold primary-text">{{ $resident['name'] }}</td>
                    <td>{{ $resident['room'] }}</td>
                    <td>{{ $resident['branch'] }}</td>
                    <td>{{ $resident['admission_date'] }}</td>
                    <td>
                        <span class="badge {{ $resident['status'] === 'active' ? 'badge-success' : 'badge-warning' }}">
                            {{ ucfirst($resident['status']) }}
                        </span>
                    </td>
                    <td>{{ $resident['last_vitals_date'] }}</td>
                    <td>
                        @php
                            $healthClass = match(strtolower($resident['health_status'])) {
                                'excellent' => 'badge-success',
                                'good' => 'badge-info',
                                'fair' => 'badge-warning',
                                'poor' => 'badge-danger',
                                default => 'badge-info'
                            };
                        @endphp
                        <span class="badge {{ $healthClass }}">
                            {{ ucfirst($resident['health_status']) }}
                        </span>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
