<x-filament-widgets::widget>
    @php
        $user = auth()->user();
        $residentCount = \App\Models\Resident::where('is_active', true)->count();
        $todayAppointments = \App\Models\Appointment::whereDate('appointment_date', today())->count();
        $pendingTasks = \App\Models\Assessment::whereNotIn('status', ['approved', 'archived'])->count();
    @endphp
    
    <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-xl border border-sky-400/20">
        <!-- Decorative background pattern -->
        <div class="absolute inset-0 opacity-10">
            <div class="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48">
                <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
            </div>
            <div class="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32">
                <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
            </div>
        </div>
        
        <div class="relative px-4 sm:px-6 py-4 sm:py-5">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <!-- Left: Welcome message -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <h2 class="text-xl sm:text-2xl font-bold text-white">
                            Welcome back, {{ $user->name }}!
                        </h2>
                        <span class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                            {{ now()->format('M j') }}
                        </span>
                    </div>
                    <p class="text-sky-100 text-sm sm:text-base mb-3">
                        @if($user->hasRole('administrator') || $user->hasRole('super_admin'))
                            Managing care with compassion and excellence
                        @else
                            Providing exceptional care to {{ $user->assignments()->count() ?? 'our' }} residents
                        @endif
                    </p>
                    
                    <!-- Quick stats summary -->
                    <div class="grid grid-cols-3 gap-2 sm:gap-3 mt-3">
                        <div class="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2 border border-white/20">
                            <div class="text-xs text-sky-100 mb-0.5">Residents</div>
                            <div class="text-lg sm:text-xl font-bold text-white">{{ $residentCount }}</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2 border border-white/20">
                            <div class="text-xs text-sky-100 mb-0.5">Today</div>
                            <div class="text-lg sm:text-xl font-bold text-white">{{ $todayAppointments }}</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-2 border border-white/20">
                            <div class="text-xs text-sky-100 mb-0.5">Pending</div>
                            <div class="text-lg sm:text-xl font-bold text-white">{{ $pendingTasks }}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Right: Date and time -->
                <div class="hidden md:flex flex-col items-end space-y-2">
                    <div class="text-right">
                        <p class="text-sky-100 text-xs font-medium">{{ now()->format('l') }}</p>
                        <p class="text-white text-lg font-semibold">{{ now()->format('F j, Y') }}</p>
                        <p class="text-sky-200 text-sm">{{ now()->format('g:i A') }}</p>
                    </div>
                    <div class="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                        <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-filament-widgets::widget>
