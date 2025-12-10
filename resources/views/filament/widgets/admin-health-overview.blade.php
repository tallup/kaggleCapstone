<x-filament-widgets::widget>
    @php
        $data = $this->getViewData();
    @endphp
    
    <div class="space-y-4">
        <!-- Health Status Cards -->
        <div class="grid grid-cols-2 gap-3">
            <div class="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-emerald-700 dark:text-emerald-300">Excellent</span>
                    <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <div class="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{{ $data['health_status']['excellent'] }}</div>
            </div>
            
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium text-blue-700 dark:text-blue-300">Good</span>
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ $data['health_status']['good'] }}</div>
            </div>
        </div>
        
        <!-- Key Metrics -->
        <div class="space-y-2">
            <div class="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <span class="text-sm font-medium text-amber-900 dark:text-amber-100">Needs Attention</span>
                </div>
                <span class="text-lg font-bold text-amber-900 dark:text-amber-100">{{ $data['health_status']['needs_attention'] }}</span>
            </div>
            
            <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Pending Assessments</span>
                </div>
                <span class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ $data['pending_assessments'] }}</span>
            </div>
            
            <div class="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <span class="text-sm font-medium text-purple-700 dark:text-purple-300">Needing Vitals</span>
                </div>
                <span class="text-lg font-bold text-purple-900 dark:text-purple-100">{{ $data['needing_vitals'] }}</span>
            </div>
        </div>
        
        <!-- Progress Bar -->
        <div class="pt-2">
            <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Vitals Coverage</span>
                <span>{{ round(($data['recent_vitals'] / max($data['total_residents'], 1)) * 100) }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div class="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-300" 
                     style="width: {{ ($data['recent_vitals'] / max($data['total_residents'], 1)) * 100 }}%"></div>
            </div>
        </div>
    </div>
</x-filament-widgets::widget>





















