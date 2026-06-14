<x-filament-panels::page>
    <div class="space-y-6">
        
        <!-- Header & Search -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white">Resident Reporting Hub</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Select a resident to generate or view their clinical reports.</p>
                </div>
                <div class="relative max-w-sm w-full">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <x-heroicon-o-magnifying-glass class="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                        type="text" 
                        wire:model.live="search"
                        placeholder="Search residents by name or room..." 
                        class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-teal-500 focus:border-teal-500 dark:text-white"
                    >
                </div>
            </div>
        </div>

        <!-- Resident Card Directory -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @forelse($this->getResidents() as $resident)
                <div 
                    wire:click="selectResident({{ $resident->id }})"
                    class="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-600 transition-all cursor-pointer overflow-hidden"
                >
                    <!-- Background Accent -->
                    <div class="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-teal-50 dark:bg-teal-900/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                    
                    <div class="relative flex items-center gap-4">
                        <div class="h-14 w-14 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-xl border-2 border-white dark:border-gray-800 shadow-sm">
                            {{ substr($resident->name, 0, 1) }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-teal-600 transition-colors">
                                {{ $resident->name }}
                            </h3>
                            <div class="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <x-heroicon-o-home class="w-3.5 h-3.5 mr-1" />
                                Room {{ $resident->room ?? 'N/A' }} 
                                <span class="mx-1.5">•</span>
                                {{ $resident->branch->name ?? 'N/A' }}
                            </div>
                        </div>
                    </div>

                    <div class="mt-4 flex items-center justify-between">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border border-teal-100 dark:border-teal-800">
                            Active
                        </span>
                        <div class="text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform">
                            <x-heroicon-o-chevron-right class="w-5 h-5" />
                        </div>
                    </div>
                </div>
            @empty
                <div class="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <x-heroicon-o-user-group class="mx-auto h-12 w-12 text-gray-300" />
                    <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No residents found</h3>
                    <p class="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
                </div>
            @endforelse
        </div>

        <!-- Global Reports Section (Charts) -->
        <div class="pt-8 border-t border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-6">Global Overview</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Health Distribution</h4>
                    <div class="h-64">
                        <canvas id="residentHealthChart"></canvas>
                    </div>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">Staff Performance</h4>
                    <div class="h-64">
                        <canvas id="staffPerformanceChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Resident Report Hub Modal -->
    <x-filament::modal id="resident-report-hub" width="2xl">
        <x-slot name="header">
            @php
                $resident = $selectedResidentId ? \App\Models\Resident::find($selectedResidentId) : null;
            @endphp
            <div class="flex items-center gap-4">
                <div class="h-12 w-12 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">
                    {{ $resident ? substr($resident->name, 0, 1) : '?' }}
                </div>
                <div>
                    <h2 class="text-xl font-bold text-gray-900 capitalize">
                        {{ $resident ? $resident->name : 'Resident Report Hub' }}
                    </h2>
                    <p class="text-sm text-gray-500">Choose a specific module to generate a professional report.</p>
                </div>
            </div>
        </x-slot>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <!-- Medication Administration Record (MAR) -->
            <button 
                wire:click="exportResidentMAR"
                class="flex flex-col items-center justify-center p-6 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-xl transition-colors group"
            >
                <div class="p-3 bg-white rounded-full text-teal-600 shadow-sm group-hover:scale-110 transition-transform mb-3">
                    <x-heroicon-o-clipboard-document-list class="h-6 w-6" />
                </div>
                <span class="font-bold text-teal-900">Medication MAR</span>
                <span class="text-xs text-teal-600 mt-1">Full monthly log</span>
            </button>

            <!-- Vitals Log -->
            <button 
                wire:click="exportResidentVitals"
                class="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors group"
            >
                <div class="p-3 bg-white rounded-full text-blue-600 shadow-sm group-hover:scale-110 transition-transform mb-3">
                    <x-heroicon-o-heart class="h-6 w-6" />
                </div>
                <span class="font-bold text-blue-900">Vitals History</span>
                <span class="text-xs text-blue-600 mt-1">Lates 30 days log</span>
            </button>

            <!-- Incidents/Notes (Future) -->
            <button 
                disabled
                class="flex flex-col items-center justify-center p-6 bg-amber-50 opacity-60 border border-amber-100 rounded-xl cursor-not-allowed"
            >
                <div class="p-3 bg-white rounded-full text-amber-600 shadow-sm mb-3">
                    <x-heroicon-o-exclamation-triangle class="h-6 w-6" />
                </div>
                <span class="font-bold text-amber-900">Incident History</span>
                <span class="text-xs text-amber-600 mt-1">Coming soon</span>
            </button>

            <!-- Assessments (Future) -->
            <button 
                disabled
                class="flex flex-col items-center justify-center p-6 bg-purple-50 opacity-60 border border-purple-100 rounded-xl cursor-not-allowed"
            >
                <div class="p-3 bg-white rounded-full text-purple-600 shadow-sm mb-3">
                    <x-heroicon-o-document-check class="h-6 w-6" />
                </div>
                <span class="font-bold text-purple-900">Assessments</span>
                <span class="text-xs text-purple-600 mt-1">Coming soon</span>
            </button>
        </div>

        <x-slot name="footer">
            <p class="text-center text-xs text-gray-400">
                All reports are generated in high-fidelity PDF format with facility branding.
            </p>
        </x-slot>
    </x-filament::modal>

    <!-- Chart.js Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Resident Health Status Chart
            const residentCtx = document.getElementById('residentHealthChart');
            if (residentCtx) {
                const residentData = @json($this->getResidentCareData());
                
                new Chart(residentCtx, {
                    type: 'doughnut',
                    data: {
                        labels: residentData.labels,
                        datasets: [{
                            data: residentData.data,
                            backgroundColor: residentData.colors,
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#ffffff' : '#374151'
                                }
                            }
                        }
                    }
                });
            }

            // Staff Performance Chart
            const staffCtx = document.getElementById('staffPerformanceChart');
            if (staffCtx) {
                const staffData = @json($this->getStaffPerformanceData());
                
                const labels = staffData.map(staff => staff.name);
                const vitalsData = staffData.map(staff => staff.vitals_recorded);
                const assessmentsData = staffData.map(staff => staff.assessments_completed);
                
                new Chart(staffCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Vitals Recorded',
                                data: vitalsData,
                                backgroundColor: '#14b8a6',
                                borderRadius: 6
                            },
                            {
                                label: 'Assessments',
                                data: assessmentsData,
                                backgroundColor: '#0f766e',
                                borderRadius: 6
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        },
                        scales: {
                            x: { stacked: true, grid: { display: false } },
                            y: { stacked: true }
                        }
                    }
                });
            }
        });
    </script>
</x-filament-panels::page>