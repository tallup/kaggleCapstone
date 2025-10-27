<?php

namespace App\Filament\Navigation;

use Filament\Navigation\NavigationItem;
use Filament\Navigation\NavigationGroup;
use Filament\Navigation\NavigationBuilder;
use Filament\Facades\Filament;

class CustomNavigationProvider
{
    public function __invoke(NavigationBuilder $builder): NavigationBuilder
    {
        return $builder
            ->items([
                // Dashboard - First item
                NavigationItem::make('Dashboard')
                    ->icon('heroicon-o-chart-bar')
                    ->url(route('filament.admin.pages.dashboard'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.dashboard'))
                    ->sort(-1000),

                // Appointment
                NavigationItem::make('Appointment')
                    ->icon('heroicon-o-calendar-days')
                    ->url(route('filament.admin.resources.appointments.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.appointments.*'))
                    ->sort(-900),

                // Assessments
                NavigationItem::make('Assessments')
                    ->icon('heroicon-o-clipboard-document-list')
                    ->url(route('filament.admin.resources.assessments.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.assessments.*'))
                    ->sort(-800),

                // Vitals
                NavigationItem::make('Vitals')
                    ->icon('heroicon-o-heart')
                    ->url(route('filament.admin.pages.view-vitals'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.view-vitals'))
                    ->sort(-700),

                // Sleep
                NavigationItem::make('Sleep')
                    ->icon('heroicon-o-moon')
                    ->url(route('filament.admin.resources.sleep-records.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.sleep-records.*'))
                    ->sort(-600),

                // Reports (with dropdown)
                NavigationItem::make('Reports')
                    ->icon('heroicon-o-chart-bar-square')
                    ->url('#')
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.*reports*') || request()->routeIs('filament.admin.pages.*charts*'))
                    ->sort(-500)
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
                    ]),

                // Staff (with dropdown)
                NavigationItem::make('Staff')
                    ->icon('heroicon-o-user-group')
                    ->url('#')
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.users.*') || request()->routeIs('filament.admin.resources.leave-requests.*'))
                    ->sort(-400)
                    ->childItems([
                        NavigationItem::make('Manage Users')
                            ->url(route('filament.admin.resources.users.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.users.*')),
                        
                        NavigationItem::make('Leave Requests')
                            ->url(route('filament.admin.resources.leave-requests.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.leave-requests.*')),
                        
                        NavigationItem::make('Roles & Permissions')
                            ->url(route('filament.admin.resources.roles.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.roles.*')),
                    ]),

                // Administration (with dropdown)
                NavigationItem::make('Administration')
                    ->icon('heroicon-o-cog-6-tooth')
                    ->url('#')
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.facilities.*') || request()->routeIs('filament.admin.resources.branches.*') || request()->routeIs('filament.admin.resources.vital-ranges.*'))
                    ->sort(-300)
                    ->childItems([
                        NavigationItem::make('Facilities')
                            ->url(route('filament.admin.resources.facilities.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.facilities.*')),
                        
                        NavigationItem::make('Branches')
                            ->url(route('filament.admin.resources.branches.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.branches.*')),
                        
                        NavigationItem::make('Vital Ranges')
                            ->url(route('filament.admin.resources.vital-ranges.index'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.vital-ranges.*')),
                    ]),
            ]);
    }
}





