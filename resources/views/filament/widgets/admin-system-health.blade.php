<x-filament-widgets::widget>
    @php
        $data = $this->getViewData();
    @endphp
    
    <div class="space-y-4">
        <!-- System Metrics -->
        <div class="space-y-3">
            <!-- User Activity -->
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">User Activity</span>
                    <span class="text-xs font-bold text-gray-900 dark:text-gray-100">{{ $data['user_activity_rate'] }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300" 
                         style="width: {{ $data['user_activity_rate'] }}%"></div>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ $data['active_users'] }} / {{ $data['total_users'] }} active
                </div>
            </div>
            
            <!-- Data Completeness -->
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Data Completeness</span>
                    <span class="text-xs font-bold text-gray-900 dark:text-gray-100">{{ $data['data_completeness'] }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-300" 
                         style="width: {{ $data['data_completeness'] }}%"></div>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ $data['residents_with_complete_data'] }} / {{ $data['total_active_residents'] }} residents
                </div>
            </div>
            
            <!-- System Load -->
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">System Load</span>
                    <span class="text-xs font-bold text-gray-900 dark:text-gray-100">{{ $data['system_load'] }}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r {{ $data['system_load'] > 80 ? 'from-red-500 to-red-600' : ($data['system_load'] > 50 ? 'from-amber-500 to-orange-600' : 'from-green-500 to-emerald-600') }} h-2 rounded-full transition-all duration-300" 
                         style="width: {{ $data['system_load'] }}%"></div>
                </div>
            </div>
        </div>
        
        <!-- Status Indicators -->
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
                @if($data['db_health'] === 'good')
                    <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span class="text-xs text-gray-700 dark:text-gray-300">DB: Good</span>
                @elseif($data['db_health'] === 'warning')
                    <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span class="text-xs text-gray-700 dark:text-gray-300">DB: Slow</span>
                @else
                    <div class="w-2 h-2 rounded-full bg-red-500"></div>
                    <span class="text-xs text-gray-700 dark:text-gray-300">DB: Critical</span>
                @endif
            </div>
            
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span class="text-xs text-gray-700 dark:text-gray-300">{{ $data['upcoming_appointments'] }} Appointments</span>
            </div>
        </div>
    </div>
</x-filament-widgets::widget>

