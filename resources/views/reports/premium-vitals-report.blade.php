@extends('reports.premium-base')

@section('content')
    <div class="section-header">Vital Signs Historical Log (Last 30 Days)</div>

    <table class="premium-table">
        <thead>
            <tr>
                <th>Date / Time</th>
                <th>Resident</th>
                <th>BP (Sys/Dia)</th>
                <th>Pulse</th>
                <th>Temp</th>
                <th>O2 Sat</th>
                <th>BMI</th>
                <th>Taken By</th>
            </tr>
        </thead>
        <tbody>
            @foreach($vitals as $vital)
                <tr>
                    <td>{{ $vital['date'] }} <span class="text-gray-500">{{ $vital['time'] }}</span></td>
                    <td class="font-bold primary-text">{{ $vital['resident_name'] }}</td>
                    <td class="font-bold {{ intval($vital['systolic']) > 140 ? 'text-red-600' : '' }}">
                        {{ $vital['systolic'] }}/{{ $vital['diastolic'] }}
                    </td>
                    <td>{{ $vital['pulse'] }} bpm</td>
                    <td>{{ $vital['temperature'] }}°F</td>
                    <td>{{ $vital['oxygen_saturation'] }}%</td>
                    <td>{{ $vital['bmi'] }}</td>
                    <td class="text-xs">{{ $vital['taken_by'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
