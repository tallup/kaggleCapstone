<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;
use App\Models\User;
use App\Models\Resident;
use App\Models\Appointment;
use App\Models\Medication;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdminSystemHealthWidget extends Widget
{
    protected static string $view = 'filament.widgets.admin-system-health';
    protected static ?string $heading = 'System Health';
    protected static ?int $sort = 12;
    protected static ?string $pollingInterval = '120s';
    
    protected int | string | array $columnSpan = [
        'md' => 1,
        'xl' => 1,
    ];
    
    public function getViewData(): array
    {
        return Cache::remember('admin.system.health', 180, function () {
            // Active users
            $activeUsers = User::where('is_active', true)->count();
            $totalUsers = User::count();
            $userActivityRate = $totalUsers > 0 ? ($activeUsers / $totalUsers) * 100 : 0;
            
            // Data completeness
            $residentsWithCompleteData = Resident::where('is_active', true)
                ->whereHas('vitalSigns')
                ->whereHas('medicationOrders')
                ->count();
            $totalActiveResidents = Resident::where('is_active', true)->count();
            $dataCompleteness = $totalActiveResidents > 0 
                ? ($residentsWithCompleteData / $totalActiveResidents) * 100 
                : 0;
            
            // Upcoming appointments coverage
            $upcomingAppointments = Appointment::whereDate('appointment_date', '>=', now())
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->count();
            
            // System load (simplified - could be enhanced with actual system metrics)
            try {
                $recentActivity = DB::table('activity_logs')
                    ->where('created_at', '>=', now()->subHour())
                    ->count();
                $systemLoad = min(100, ($recentActivity / 100) * 100); // Normalize to 0-100
            } catch (\Exception $e) {
                $systemLoad = 0;
            }
            
            // Database health (check if queries are responsive)
            $dbHealth = 'good';
            try {
                $start = microtime(true);
                DB::select('SELECT 1');
                $queryTime = (microtime(true) - $start) * 1000;
                if ($queryTime > 100) {
                    $dbHealth = 'warning';
                } elseif ($queryTime > 500) {
                    $dbHealth = 'critical';
                }
            } catch (\Exception $e) {
                $dbHealth = 'critical';
            }
            
            return [
                'active_users' => $activeUsers,
                'total_users' => $totalUsers,
                'user_activity_rate' => round($userActivityRate, 1),
                'data_completeness' => round($dataCompleteness, 1),
                'upcoming_appointments' => $upcomingAppointments,
                'system_load' => round($systemLoad, 1),
                'db_health' => $dbHealth,
                'residents_with_complete_data' => $residentsWithCompleteData,
                'total_active_residents' => $totalActiveResidents,
            ];
        });
    }
}

