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
                // Dashboard
                NavigationItem::make('Dashboard')
                    ->icon('heroicon-o-chart-bar')
                    ->url(route('filament.admin.pages.dashboard'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.dashboard'))
                    ->sort(-1000),

                // Medications
                NavigationItem::make('Medications')
                    ->icon('heroicon-o-beaker')
                    ->url(route('filament.admin.resources.medications.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.medications.*'))
                    ->sort(-900),

                // Appointment
                NavigationItem::make('Appointment')
                    ->icon('heroicon-o-calendar-days')
                    ->url(route('filament.admin.resources.appointments.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.appointments.*'))
                    ->sort(-800),

                // Assessments
                NavigationItem::make('Assessments')
                    ->icon('heroicon-o-clipboard-document-list')
                    ->url(route('filament.admin.resources.assessments.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.assessments.*'))
                    ->sort(-700),

                // Vitals
                NavigationItem::make('Vitals')
                    ->icon('heroicon-o-heart')
                    ->url(route('filament.admin.pages.view-vitals'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.view-vitals'))
                    ->sort(-600),

                // Sleep
                NavigationItem::make('Sleep')
                    ->icon('heroicon-o-moon')
                    ->url(route('filament.admin.resources.sleep-records.index'))
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.sleep-records.*'))
                    ->sort(-500),

                // Reports (with dropdown)
                NavigationItem::make('Reports')
                    ->icon('heroicon-o-chart-bar-square')
                    ->url('#')
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.*reports*'))
                    ->sort(-400)
                    ->childItems([
                        NavigationItem::make('Medication History')
                            ->icon('heroicon-o-cube')
                            ->url(route('filament.admin.pages.medication-history'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.medication-history')),
                        
                        NavigationItem::make('Vitals History')
                            ->icon('heroicon-o-heart')
                            ->url(route('filament.admin.pages.vitals-history'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.vitals-history')),
                        
                        NavigationItem::make('Reports')
                            ->icon('heroicon-o-document-text')
                            ->url(route('filament.admin.pages.reports'))
                            ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.pages.reports')),
                    ]),

                // Staff (with dropdown)
                NavigationItem::make('Staff')
                    ->icon('heroicon-o-user-group')
                    ->url('#')
                    ->isActiveWhen(fn (): bool => request()->routeIs('filament.admin.resources.users.*') || request()->routeIs('filament.admin.resources.leave-requests.*'))
                    ->sort(-300)
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
                    ->sort(-200)
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





