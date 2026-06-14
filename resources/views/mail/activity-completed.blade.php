@component('mail::message')
# {{ $title }}

**Completed By:** {{ $performerName }}  
**Time:** {{ $timestamp }}

@foreach($details as $label => $value)
**{{ $label }}:** {{ $value }}  
@endforeach

@if($actionUrl)
@component('mail::button', ['url' => $actionUrl])
View Details
@endcomponent
@endif

Thank you,<br>
{{ config('app.name') }}
@endcomponent
