<x-filament-panels::page>
    <div class="space-y-8">
        <!-- Hero -->
        <div class="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2D5016] via-[#3b6a1f] to-[#5a8f30] p-6">
            <div class="relative z-10 flex items-center justify-between">
                <div>
                    <h1 class="text-2xl md:text-3xl font-semibold text-white">Caregiver Dashboard</h1>
                    <p class="mt-1 text-white/80 text-sm">Welcome back, {{ auth()->user()->name }} · {{ now()->format('D, M j') }}</p>
                </div>
                <div class="hidden md:flex items-center gap-3">
                    <a href="{{ route('filament.admin.resources.vital-signs.create') }}" class="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm transition">
                        <x-heroicon-o-plus class="w-4 h-4"/> Record Vitals
                    </a>
                    <a href="{{ route('filament.admin.resources.medication-administrations.create') }}" class="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm transition">
                        <x-heroicon-o-cube class="w-4 h-4"/> Log Medication
                    </a>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <a href="{{ route('filament.admin.resources.vital-signs.create') }}" 
                   class="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <x-heroicon-o-heart class="h-5 w-5 text-gray-400" />
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">Record Vitals</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Log vital signs</p>
                    </div>
                </a>

                <a href="{{ route('filament.admin.pages.custom-appointments') }}" 
                   class="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <x-heroicon-o-calendar-days class="h-5 w-5 text-gray-400" />
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">Appointments</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">View appointments</p>
                    </div>
                </a>

                <a href="{{ route('filament.admin.resources.leave-requests.create') }}" 
                   class="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <x-heroicon-o-clock class="h-5 w-5 text-gray-400" />
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">Request Leave</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Submit leave request</p>
                    </div>
                </a>

                <a href="{{ route('filament.admin.resources.residents.index') }}" 
                   class="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <x-heroicon-o-users class="h-5 w-5 text-gray-400" />
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">My Residents</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">View assigned residents</p>
                    </div>
                </a>
            </div>
        </div>

        <!-- KPI Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- My Residents -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">My Residents</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ $this->getStats()['assigned_residents'] ?? 0 }}</p>
                    </div>
                    <x-heroicon-o-users class="h-8 w-8 text-gray-400" />
                </div>
            </div>

            <!-- Today's Appointments -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Today's Appointments</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ $this->getStats()['todays_appointments'] ?? 0 }}</p>
                    </div>
                    <x-heroicon-o-calendar-days class="h-8 w-8 text-gray-400" />
                </div>
            </div>

            <!-- Pending Assessments -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Pending Assessments</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ $this->getStats()['pending_assessments'] ?? 0 }}</p>
                    </div>
                    <x-heroicon-o-document-text class="h-8 w-8 text-gray-400" />
                </div>
            </div>

            <!-- Vitals Recorded Today -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Vitals Recorded Today</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">{{ $this->getStats()['vitals_recorded_today'] ?? 0 }}</p>
                    </div>
                    <x-heroicon-o-heart class="h-8 w-8 text-gray-400" />
                </div>
            </div>
        </div>

        <!-- Workboard -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <!-- Weekly Activity Chart -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 xl:col-span-2 shadow-sm">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Weekly Activity</h3>
                <div class="h-64">
                    <canvas id="weeklyActivityChart"></canvas>
                </div>
            </div>

            <!-- Resident Health Status -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Resident Health Status</h3>
                <div class="h-64">
                    <canvas id="residentHealthChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Workflow Columns -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <!-- Due Medications Today -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Due Medications Today</h3>
                <div class="space-y-3">
                    @forelse($this->getDueMedicationsToday() as $m)
                        <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div class="min-w-0">
                                <p class="font-medium text-gray-900 dark:text-white truncate">{{ $m['resident'] }}</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ $m['name'] }} — {{ $m['times'] }}</p>
                            </div>
                            <a href="{{ route('filament.admin.resources.medication-administrations.create') }}?medication={{ $m['id'] }}" class="text-sm text-[#2D5016] hover:underline">Log</a>
                        </div>
                    @empty
                        <p class="text-gray-600 dark:text-gray-400 text-center py-4">No medications due.</p>
                    @endforelse
                </div>
            </div>

            <!-- Upcoming Appointments -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Upcoming Appointments</h3>
                <div class="space-y-3">
                    @forelse($this->getUpcomingAppointmentsList() as $a)
                        <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                                <p class="font-medium text-gray-900 dark:text-white">{{ $a['resident'] }}</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $a['date'] }} • {{ $a['time'] }}</p>
                            </div>
                            <span class="text-xs rounded-full px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{{ $a['status'] }}</span>
                        </div>
                    @empty
                        <p class="text-gray-600 dark:text-gray-400 text-center py-4">No upcoming appointments.</p>
                    @endforelse
                </div>
            </div>

            <!-- Today's Tasks -->
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Today's Tasks</h3>
                <div class="space-y-3">
                @forelse($this->getTasks()['appointments'] as $appointment)
                    <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div class="flex items-center gap-3">
                            <x-heroicon-o-calendar-days class="h-5 w-5 text-gray-400" />
                            <div>
                                <p class="font-medium text-gray-900 dark:text-white">{{ $appointment['resident_name'] }}</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $appointment['description'] }}</p>
                            </div>
                        </div>
                        <span class="text-sm text-gray-500 dark:text-gray-400">{{ $appointment['time'] }}</span>
                    </div>
                @empty
                    <p class="text-gray-600 dark:text-gray-400 text-center py-4">No appointments scheduled for today.</p>
                @endforelse
                </div>
            </div>
        </div>

        <!-- My Residents List -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">My Residents</h3>
            <div class="space-y-3">
                @forelse($this->getResidents() as $resident)
                    <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div class="flex items-center gap-3">
                            <x-heroicon-o-user class="h-5 w-5 text-gray-400" />
                            <div>
                                <p class="font-medium text-gray-900 dark:text-white">{{ $resident['name'] }}</p>
                                <p class="text-sm text-gray-600 dark:text-gray-400">{{ $resident['room'] }} - {{ $resident['branch'] }}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-sm font-medium @if($resident['health_status'] == 'attention') text-orange-600 @elseif($resident['health_status'] == 'caution') text-red-600 @else text-green-600 @endif">
                                {{ ucfirst($resident['health_status']) }}
                            </span>
                            <p class="text-xs text-gray-500 dark:text-gray-400">{{ $resident['last_vitals'] }}</p>
                        </div>
                    </div>
                @empty
                    <p class="text-gray-600 dark:text-gray-400 text-center py-4">No residents assigned to you.</p>
                @endforelse
            </div>
        </div>
    </div>

    <!-- Chart.js Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Weekly Activity Chart
            const weeklyActivityCtx = document.getElementById('weeklyActivityChart');
            if (weeklyActivityCtx) {
                const chartData = @json($this->getChartData());
                new Chart(weeklyActivityCtx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: chartData.datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: 'rgb(156 163 175)', // gray-400
                                }
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    color: 'rgb(156 163 175)', // gray-400
                                },
                                grid: {
                                    color: 'rgba(107, 114, 128, 0.2)', // gray-500 with opacity
                                }
                            },
                            y: {
                                ticks: {
                                    color: 'rgb(156 163 175)', // gray-400
                                },
                                grid: {
                                    color: 'rgba(107, 114, 128, 0.2)', // gray-500 with opacity
                                }
                            }
                        }
                    }
                });
            }

            // Resident Health Chart
            const residentHealthCtx = document.getElementById('residentHealthChart');
            if (residentHealthCtx) {
                const residentHealthData = @json($this->getResidentCareData());
                new Chart(residentHealthCtx, {
                    type: 'doughnut',
                    data: {
                        labels: residentHealthData.labels,
                        datasets: [{
                            data: residentHealthData.data,
                            backgroundColor: residentHealthData.colors,
                            borderColor: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#374151' : '#ffffff',
                            borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#ffffff' : '#374151'
                                }
                            }
                        }
                    }
                });
            }
        });
    </script>
</x-filament-panels::page>