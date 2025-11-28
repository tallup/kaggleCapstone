<x-filament-widgets::widget>
    <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Fast access to common tasks</p>
                </div>
            </div>
            <span class="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                {{ \App\Models\User::where('is_active', true)->count() }} Active Users
            </span>
        </div>
        
        <!-- Actions Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <!-- Add Resident -->
            <a href="{{ route('filament.admin.resources.residents.create') }}" class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800 p-3 sm:p-4 hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation">
                <div class="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-3 space-y-2 sm:space-y-0">
                    <div class="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm flex-shrink-0">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0 text-center sm:text-left">
                        <h4 class="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Add Resident</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">New intake</p>
                    </div>
                </div>
            </a>
            
            <!-- Schedule Appointment -->
            <a href="{{ route('filament.admin.resources.appointments.create') }}" class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 p-3 sm:p-4 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation">
                <div class="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-3 space-y-2 sm:space-y-0">
                    <div class="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm flex-shrink-0">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0 text-center sm:text-left">
                        <h4 class="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Appointment</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">Schedule visit</p>
                    </div>
                </div>
            </a>
            
            <!-- Add Medication -->
            <a href="{{ route('filament.admin.resources.medications.create') }}" class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 p-3 sm:p-4 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation">
                <div class="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-3 space-y-2 sm:space-y-0">
                    <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm flex-shrink-0">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0 text-center sm:text-left">
                        <h4 class="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Medication</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">New prescription</p>
                    </div>
                </div>
            </a>
            
            <!-- Record Vital Signs -->
            <a href="{{ route('filament.admin.resources.vital-signs.create') }}" class="group relative overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 p-3 sm:p-4 hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 touch-manipulation">
                <div class="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-3 space-y-2 sm:space-y-0">
                    <div class="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm flex-shrink-0">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0 text-center sm:text-left">
                        <h4 class="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">Vitals</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">Record health data</p>
                    </div>
                </div>
            </a>
        </div>
        
        <!-- Mobile Floating Action Button -->
        <div class="lg:hidden">
            <button onclick="toggleFabMenu()" class="fab" aria-label="Quick Actions Menu">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
            </button>
            
            <div id="fab-menu" class="fab-menu">
                <a href="{{ route('filament.admin.resources.residents.create') }}" class="fab-menu-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                    Add Resident
                </a>
                <a href="{{ route('filament.admin.resources.appointments.create') }}" class="fab-menu-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Schedule Appointment
                </a>
                <a href="{{ route('filament.admin.resources.medications.create') }}" class="fab-menu-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                    </svg>
                    Add Medication
                </a>
                <a href="{{ route('filament.admin.resources.vital-signs.create') }}" class="fab-menu-item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Record Vitals
                </a>
            </div>
        </div>
        
        <script>
            function toggleFabMenu() {
                const menu = document.getElementById('fab-menu');
                menu.classList.toggle('active');
            }
            
            // Close menu when clicking outside
            document.addEventListener('click', function(event) {
                const menu = document.getElementById('fab-menu');
                const fab = document.querySelector('.fab');
                if (menu && fab && !menu.contains(event.target) && !fab.contains(event.target)) {
                    menu.classList.remove('active');
                }
            });
        </script>
    </div>
</x-filament-widgets::widget>







