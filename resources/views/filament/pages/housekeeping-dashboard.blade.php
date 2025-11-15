@php
    $statusColors = [
        'completed' => 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        'skipped' => 'bg-amber-50 text-amber-700 ring-amber-200',
        'pending' => 'bg-gray-100 text-gray-600 ring-gray-200',
    ];
@endphp

<x-filament::page>
    <div class="space-y-6">
        <div class="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 p-6 text-white shadow-xl">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p class="text-sm font-semibold uppercase tracking-wide text-emerald-100">Operations Overview</p>
                    <h1 class="text-3xl font-semibold">Housekeeping Dashboard</h1>
                    <p class="mt-2 max-w-2xl text-sm text-emerald-100">
                        Monitor daily cleaning progress, verify float accountability, and act on skipped or pending tasks before shift changes.
                    </p>
                </div>
                <div class="flex gap-3">
                    <x-filament::button wire:click="loadData" color="white" class="text-emerald-600">
                        Refresh
                    </x-filament::button>
                </div>
            </div>
        </div>

        <x-filament::section>
            <x-slot name="heading">Filters</x-slot>
            {{ $this->filterForm }}
        </x-filament::section>

        <div class="grid gap-4 md:grid-cols-5">
            <x-filament::stats-card
                label="Tasks Today"
                value="{{ number_format($summary['total'] ?? 0) }}"
                description="Across all active areas"
            />
            <x-filament::stats-card
                label="Completed"
                value="{{ number_format($summary['completed'] ?? 0) }}"
                description="Marked complete"
                icon="heroicon-o-check-circle"
                color="success"
            />
            <x-filament::stats-card
                label="Skipped"
                value="{{ number_format($summary['skipped'] ?? 0) }}"
                description="Requires follow-up"
                icon="heroicon-o-x-circle"
                color="warning"
            />
            <x-filament::stats-card
                label="Pending"
                value="{{ number_format($summary['pending'] ?? 0) }}"
                description="Still outstanding"
                icon="heroicon-o-clock"
            />
            <x-filament::stats-card
                label="Required Missing"
                value="{{ number_format($summary['required_missing'] ?? 0) }}"
                description="Required tasks not completed"
                icon="heroicon-o-exclamation-triangle"
                color="danger"
            />
        </div>

        <x-filament::section>
            <x-slot name="heading">Daily Checklist Status</x-slot>
            @if ($rows->isEmpty())
                <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No tasks scheduled for your filters. Adjust the date or choose a different area.
                </div>
            @else
                <div class="overflow-x-auto rounded-3xl border border-gray-100 shadow-sm">
                    <table class="min-w-full divide-y divide-gray-100 text-sm">
                        <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th class="px-4 py-3">Area / Shift</th>
                                <th class="px-4 py-3">Task</th>
                                <th class="px-4 py-3">Status</th>
                                <th class="px-4 py-3">Initials</th>
                                <th class="px-4 py-3">Completed At</th>
                                <th class="px-4 py-3">Notes</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 bg-white">
                            @foreach ($rows as $row)
                                <tr class="{{ $row['status'] === 'pending' && $row['required'] ? 'bg-rose-50/60' : '' }}">
                                    <td class="px-4 py-3">
                                        <div class="font-semibold text-gray-900">{{ $row['area'] }}</div>
                                        <div class="text-xs text-gray-500">{{ $row['shift'] }}</div>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="font-medium text-gray-900">{{ $row['task'] }}</div>
                                        @if ($row['required'])
                                            <span class="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                <x-filament::icon icon="heroicon-o-shield-check" class="h-3 w-3" />
                                                Required
                                            </span>
                                        @endif
                                    </td>
                                    <td class="px-4 py-3">
                                        <span class="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ring-1 {{ $statusColors[$row['status']] ?? 'bg-gray-100 text-gray-600 ring-gray-200' }}">
                                            {{ ucfirst($row['status']) }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-gray-900">{{ $row['initials'] ?? '—' }}</td>
                                    <td class="px-4 py-3 text-gray-900">{{ $row['completed_at'] ?? '—' }}</td>
                                    <td class="px-4 py-3 text-gray-600">{{ $row['notes'] ?? '—' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </x-filament::section>
    </div>
</x-filament::page>
<x-filament-panels::page>

</x-filament-panels::page>
