<?php

namespace App\Filament\Navigation;

use Filament\Navigation\NavigationItem;
use Filament\Navigation\NavigationGroup;
use Filament\Navigation\NavigationBuilder;
use Filament\Facades\Filament;

class CustomNavigationProvider
{
    /**
     * Check if the current user is a caregiver
     * Checks both the roles relationship and the role column value
     */
    private function isCaregiver($user): bool
    {
        if (!$user) {
            return false;
        }
        
        // Check the roles relationship
        if ($user->hasRole('caregiver') || $user->hasRole('care_giver')) {
            return true;
        }
        
        // Check the role column value directly
        $roleValue = strtolower(trim($user->role ?? ''));
        $roleValueNormalized = str_replace([' ', '_'], '', $roleValue);
        
        // Check if role is exactly 'caregiver' (normalized)
        if ($roleValueNormalized === 'caregiver') {
            return true;
        }
        
        // Check if role contains both 'care' and 'giver' (for variations like 'care giver', 'care_giver', etc.)
        if (stripos($roleValue, 'care') !== false && stripos($roleValue, 'giver') !== false) {
            return true;
        }
        
        return false;
    }

    public function __invoke(NavigationBuilder $builder): NavigationBuilder
    {
        // COMPLETELY REPLACE navigation - don't use auto-discovered items
        // This ensures caregivers can't see Administration menu
        
        // Log that provider is being called
        \Log::info('CustomNavigationProvider called', [
            'user' => auth()->check() ? auth()->user()->name : 'guest',
            'existing_items_count' => count($builder->getItems()),
        ]);
        
        // COMPLETELY REPLACE navigation - start fresh
        // Don't use any existing items from auto-discovery
        $items = [
                // Dashboard - First item
                NavigationItem::make('Dashboard')
                    ->icon('heroicon-o-home')
                    ->url(route('filament.admin.pages.dashboard'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.dashboard'))
                    ->sort(10),

                // Assessments - Second item
                NavigationItem::make('Assessments')
                    ->icon('heroicon-o-clipboard-document-list')
                    ->url(route('filament.admin.resources.assessments.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.assessments.*'))
                    ->sort(20),

                // Appointment - Third item
                NavigationItem::make('Appointment')
                    ->icon('heroicon-o-calendar-days')
                    ->url(route('filament.admin.resources.appointments.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.appointments.*'))
                    ->sort(30),

                // Vitals - Fourth item
                NavigationItem::make('Vitals')
                    ->icon('heroicon-o-heart')
                    ->url('/admin/view-vitals')
                    ->isActiveWhen(fn (): bool => request()->is('admin/view-vitals*') || 
                        request()->is('admin/vital-signs*'))
                    ->sort(40),

                // Medication - Fifth item
                NavigationItem::make('Medication')
                    ->icon('heroicon-o-cube')
                    ->url(route('filament.admin.pages.medication-management'))
                    ->isActiveWhen(fn (): bool =>
                        request()->routeIs('filament.admin.pages.medication-*') ||
                        request()->routeIs('filament.admin.resources.medications.*') ||
                        request()->routeIs('filament.admin.resources.medication-administrations.*') ||
                        request()->routeIs('filament.admin.pages.medication*')
                    )
                    ->sort(50),

                // Sleep - Sixth item
                NavigationItem::make('Sleep')
                    ->icon('heroicon-o-moon')
                    ->url(route('filament.admin.resources.sleep-records.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.sleep-records.*'))
                    ->sort(60),

                // Reports (with dropdown) - Seventh item
                NavigationItem::make('Reports')
                    ->icon('heroicon-o-chart-bar-square')
                    ->url('#')
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.*reports*') || request()->routeIs('filament.admin.pages.*charts*'))
                    ->sort(70)
                    ->childItems([
                        NavigationItem::make('Chart Reports')
                            ->icon('heroicon-o-document-chart-bar')
                            ->url(route('filament.admin.pages.chart-reports'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.chart-reports')),
                        
                        NavigationItem::make('Resident Charts')
                            ->icon('heroicon-o-chart-bar')
                            ->url(route('filament.admin.pages.resident-charts'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.resident-charts')),
                        
                        NavigationItem::make('Vitals Charts')
                            ->icon('heroicon-o-chart-bar')
                            ->url(route('filament.admin.pages.vitals-charts'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.vitals-charts')),
                        
                        NavigationItem::make('Vitals Reports')
                            ->icon('heroicon-o-heart')
                            ->url(route('filament.admin.pages.vitals-reports'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.vitals-reports')),
                        
                        NavigationItem::make('Assessment Charts')
                            ->icon('heroicon-o-chart-bar')
                            ->url(route('filament.admin.pages.assessment-charts'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.assessment-charts')),
                        
                        NavigationItem::make('Appointments Charts')
                            ->icon('heroicon-o-chart-bar')
                            ->url(route('filament.admin.pages.appointments-charts'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.appointments-charts')),
                        
                        NavigationItem::make('Vitals History')
                            ->icon('heroicon-o-heart')
                            ->url(route('filament.admin.pages.vitals-history'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.vitals-history')),
                        
                        NavigationItem::make('Sleep Charts')
                            ->icon('heroicon-o-chart-bar')
                            ->url(route('filament.admin.pages.sleep-charts'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.sleep-charts')),
                        
                        NavigationItem::make('Staff Charts')
                            ->icon('heroicon-o-chart-bar')
                            ->url(route('filament.admin.pages.staff-charts'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.staff-charts')),
                    ];
        
        // Only add Administration menu if user is NOT a caregiver
        // ALWAYS check this - even if auth is not checked, we still don't want to add it
        $shouldAddAdminMenu = false;
        
        if (auth()->check()) {
            $user = auth()->user();
            $isCaregiver = $this->isCaregiver($user);
            
            // DEBUG: Log for troubleshooting
            \Log::info('Navigation Provider Debug', [
                'user' => $user->name,
                'role' => $user->role,
                'is_caregiver' => $isCaregiver,
                'has_view_users' => $user->hasPermission('view_users'),
                'has_view_facilities' => $user->hasPermission('view_facilities'),
            ]);
            
            // If user is NOT a caregiver AND has admin permissions, show menu
            if (!$isCaregiver && (
                $user->hasPermission('view_users') ||
                $user->hasPermission('view_facilities') ||
                $user->hasPermission('view_branches') ||
                $user->hasPermission('view_vital_ranges') ||
                $user->hasPermission('view_roles') ||
                $user->hasRole('administrator') ||
                $user->hasRole('super_admin')
            )) {
                $shouldAddAdminMenu = true;
            }
        }
        
        // Only add Administration menu if explicitly allowed
        // For caregivers, this will ALWAYS be false
        if ($shouldAddAdminMenu) {
            $items[] = NavigationItem::make('Administration')
                    ->icon('heroicon-o-cog-6-tooth')
                    ->url('#')
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.facilities.*') || 
                        request()->routeIs('filament.admin.resources.branches.*') || 
                        request()->routeIs('filament.admin.resources.vital-ranges.*') ||
                        request()->routeIs('filament.admin.resources.users.*') || 
                        request()->routeIs('filament.admin.resources.leave-requests.*') ||
                        request()->routeIs('filament.admin.resources.roles.*') ||
                        request()->routeIs('filament.admin.resources.employee-documents.*'))
                    ->sort(80)
                    ->childItems([
                        NavigationItem::make('Facilities')
                            ->url(route('filament.admin.resources.facilities.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.facilities.*'))
                            ->visible(fn (): bool => auth()->check() && (
                                auth()->user()->hasPermission('view_facilities') ||
                                auth()->user()->hasRole('administrator') ||
                                auth()->user()->hasRole('super_admin')
                            )),
                        NavigationItem::make('Branches')
                            ->url(route('filament.admin.resources.branches.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.branches.*'))
                            ->visible(fn (): bool => auth()->check() && (
                                auth()->user()->hasPermission('view_branches') ||
                                auth()->user()->hasRole('administrator') ||
                                auth()->user()->hasRole('super_admin')
                            )),
                        NavigationItem::make('Vital Ranges')
                            ->url(route('filament.admin.resources.vital-ranges.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.vital-ranges.*'))
                            ->visible(fn (): bool => auth()->check() && (
                                auth()->user()->hasPermission('view_vital_ranges') ||
                                auth()->user()->hasRole('administrator') ||
                                auth()->user()->hasRole('super_admin')
                            )),
                        NavigationItem::make('Leave Requests')
                            ->url(route('filament.admin.resources.leave-requests.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.leave-requests.*'))
                            ->visible(fn (): bool => auth()->check() && (
                                auth()->user()->hasRole('administrator') ||
                                auth()->user()->hasRole('super_admin')
                            )),
                        NavigationItem::make('Roles & Permissions')
                            ->url(route('filament.admin.resources.roles.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.roles.*'))
                            ->visible(fn (): bool => auth()->check() && (
                                auth()->user()->hasPermission('view_roles') ||
                                auth()->user()->hasRole('administrator') ||
                                auth()->user()->hasRole('super_admin')
                            )),
                        NavigationItem::make('Users')
                            ->url(route('filament.admin.resources.users.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.users.*'))
                            ->visible(fn (): bool => auth()->check() && (
                                auth()->user()->hasPermission('view_users') ||
                                auth()->user()->hasRole('administrator') ||
                                auth()->user()->hasRole('super_admin')
                            )),
                        NavigationItem::make('Employee Documents')
                            ->url(route('filament.admin.resources.employee-documents.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.employee-documents.*'))
                            ->visible(fn (): bool => auth()->check() && (
                                auth()->user()->hasRole('administrator') ||
                                auth()->user()->hasRole('super_admin')
                            )),
                    ]);
        }
        
        // Completely replace all navigation items
        // This will override any auto-discovered items
        // Also explicitly clear any groups to prevent auto-discovered resources from showing
        
        // IMPORTANT: Clear existing items and groups FIRST before adding new ones
        // This ensures no auto-discovered items remain
        $builder = $builder->items([])->groups([]);
        
        // Then add our custom items
        return $builder->items($items)->groups([]);
    }
}





