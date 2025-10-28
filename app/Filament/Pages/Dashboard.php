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
        // Redirect users to their appropriate dashboard based on role
        if (Auth::check()) {
            $user = Auth::user();
            if ($user->hasRole('administrator') || $user->hasRole('super_admin')) {
                $this->redirect(route('filament.admin.pages.admin-dashboard'));
            } elseif ($user->hasRole('caregiver')) {
                $this->redirect(route('filament.admin.pages.caregiver-dashboard'));
            } else {
                // Default fallback - redirect to admin dashboard
                $this->redirect(route('filament.admin.pages.admin-dashboard'));
            }
        } else {
            // Not authenticated, redirect to login
            $this->redirect(route('filament.admin.auth.login'));
        }
    }
}