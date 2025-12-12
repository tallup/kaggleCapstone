<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Illuminate\Support\Facades\Auth;

class Dashboard extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-home';
    protected static string $view = 'filament.pages.dashboard';
    protected static ?string $title = 'Dashboard';
    protected static ?string $navigationLabel = 'Dashboard';
    protected static ?int $navigationSort = -1000;
    protected static ?string $navigationGroup = null;

    public static function shouldRegisterNavigation(): bool
    {
        return true; // Enable navigation for Dashboard
    }

    public function mount(): void
    {
        // Redirect all non-super-admin users to the React dashboard to avoid dual dashboards
        if (!Auth::check()) {
            $this->redirect(route('filament.admin.auth.login'));
            return;
        }

        $user = Auth::user();

        // Super admins keep the Filament experience; everyone else goes to React /dashboard
        if ($user->role === 'super_admin' || $user->hasRole('super_admin')) {
            $this->redirect(route('filament.admin.pages.super-admin-dashboard'));
            return;
        }

        // All other roles: send to SPA dashboard
        $this->redirect(url('/dashboard'));
    }
}