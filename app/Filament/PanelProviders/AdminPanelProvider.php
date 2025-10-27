<?php

namespace App\Filament\PanelProviders;

use Filament\Panel;
use Filament\PanelProvider;
use App\Filament\Navigation\CustomNavigationProvider;
use Filament\Http\Responses\Auth\Contracts\LoginResponse;
use Illuminate\Http\RedirectResponse;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('/admin')
            ->login()
            ->colors([
                'primary' => '#3B82F6',
                'gray' => '#6B7280',
            ])
            ->navigationBuilder(CustomNavigationProvider::class)
            ->topNavigation()
            ->sidebarCollapsibleOnDesktop()
            ->brandName('Edmond Serenity AFH')
            ->brandLogo(asset('images/logo.png'))
            ->favicon(asset('images/favicon.ico'))
            ->maxContentWidth('full')
            ->renderHook(
                'panels::topbar.end',
                fn (): string => view('filament.components.user-menu'),
            )
            ->loginResponse(
                LoginResponse::class,
                fn (): LoginResponse => app(RoleBasedLoginResponse::class)
            );
    }
}

class RoleBasedLoginResponse implements LoginResponse
{
    public function toResponse($request): RedirectResponse
    {
        $user = auth()->user();
        
        // Redirect based on user role
        if ($user->role === 'admin' || $user->role === 'administrator') {
            return redirect()->to('/admin/admin-dashboard');
        } elseif ($user->role === 'caregiver' || $user->role === 'care_giver') {
            return redirect()->to('/admin/caregiver-dashboard');
        } elseif ($user->role === 'nurse' || $user->role === 'registered_nurse' || $user->role === 'licensed_nurse') {
            return redirect()->to('/admin/caregiver-dashboard'); // Nurses can use caregiver dashboard
        } else {
            // Default redirect for other roles
            return redirect()->to('/admin/dashboard');
        }
    }
}










