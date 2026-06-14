<?php

namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Widgets;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use App\Filament\Navigation\CustomNavigationProvider;
use App\Models\Facility;
use Illuminate\Support\Facades\Auth;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->colors(fn () => $this->getDynamicColors())
            ->font('Inter')
            ->darkMode()
            ->spa()
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                \App\Filament\Widgets\HeroSectionWidget::class,
                \App\Filament\Widgets\StatsOverviewWidget::class,
                \App\Filament\Widgets\QuickActionsWidget::class,
                Widgets\FilamentInfoWidget::class,
            ])
            ->navigation(CustomNavigationProvider::class)
            // Removed navigationGroups to prevent auto-discovery from creating groups
            ->topNavigation()
            ->brandName(fn () => $this->getDynamicBranding()['name'])
            ->brandLogo(fn () => $this->getDynamicBranding()['logo'])
            ->brandLogoHeight('2.5rem')
            ->maxContentWidth('full')
            ->sidebarCollapsibleOnDesktop()
            ->navigationGroups([
                'Dashboard' => 'Dashboard',
                'Resident Care' => 'Resident Care',
                'Reports & Analytics' => 'Reports & Analytics',
                'Administration' => 'Administration',
            ])
            ->userMenuItems([]) // Disable default user menu items
            ->renderHook(
                'panels::topbar.end',
                fn (): string => view('filament.components.user-menu'),
            )
            ->renderHook(
                'panels::topbar.start',
                fn (): string => view('filament.components.dynamic-branding')->render() . '
                    <link rel="stylesheet" href="' . asset('css/custom-enhancements.css') . '">
                    <style>
                        /* Hide Filament default user menu component */
                        [data-filament-name="account-widget"],
                        [wire\\:key*="account-widget"],
                        .fi-account-menu,
                        [x-data*="accountMenu"],
                        .fi-topbar-actions > button:last-child,
                        .fi-topbar-actions > div:last-child button {
                            display: none !important;
                        }
                    </style>
                ',
            )
            ->renderHook(
                'panels::sidebar.end',
                fn (): string => '
                    <script>
                        (function() {
                            // Function to apply border highlight design to active navigation
                            function applyBorderHighlightDesign() {
                                // Find all navigation links and buttons in the sidebar
                                const sidebar = document.querySelector(".fi-sidebar, aside");
                                if (!sidebar) return;
                                
                                const navItems = sidebar.querySelectorAll("nav a, nav button, nav li a, nav li button");
                                
                                navItems.forEach(function(item) {
                                    // Check for active state indicators
                                    const isActive = item.getAttribute("aria-current") === "page" || 
                                                   item.getAttribute("data-active") === "true" ||
                                                   item.classList.contains("fi-active") ||
                                                   item.className.includes("active") ||
                                                   item.classList.contains("bg-white");
                                    
                                    if (isActive) {
                                        // Get computed styles to determine text color
                                        const styles = window.getComputedStyle(item);
                                        const bgColor = styles.backgroundColor;
                                        
                                        // Check if background is white or very light
                                        const rgbMatch = bgColor.match(/rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\)/);
                                        const isWhiteBg = rgbMatch && 
                                                         parseInt(rgbMatch[1]) > 240 && 
                                                         parseInt(rgbMatch[2]) > 240 && 
                                                         parseInt(rgbMatch[3]) > 240;
                                        
                                        // Apply border highlight design instead of white background
                                        item.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                                        item.style.setProperty("background-color", "rgba(255, 255, 255, 0.15)", "important");
                                        
                                        // Add border highlight
                                        item.style.borderLeft = "4px solid var(--theme-text-on-primary, #FFFFFF)";
                                        item.style.setProperty("border-left", "4px solid var(--theme-text-on-primary, #FFFFFF)", "important");
                                        
                                        // Add subtle shadow
                                        item.style.boxShadow = "inset 0 0 10px rgba(255, 255, 255, 0.1)";
                                        item.style.setProperty("box-shadow", "inset 0 0 10px rgba(255, 255, 255, 0.1)", "important");
                                        
                                        // Set text color based on theme
                                        const textColor = isWhiteBg ? "#000000" : "var(--theme-text-on-primary, #FFFFFF)";
                                        item.style.color = textColor;
                                        item.style.setProperty("color", textColor, "important");
                                        item.style.fontWeight = "600";
                                        
                                        // Adjust padding to account for border
                                        const currentPadding = styles.paddingLeft;
                                        if (currentPadding && !currentPadding.includes("calc")) {
                                            item.style.paddingLeft = "calc(" + currentPadding + " - 4px)";
                                        }
                                        
                                        // Apply text color to all children
                                        const allChildren = item.querySelectorAll("*");
                                        allChildren.forEach(function(child) {
                                            child.style.color = textColor;
                                            child.style.setProperty("color", textColor, "important");
                                            
                                            // For SVG elements, also set stroke and fill
                                            if (child.tagName === "svg" || child.tagName === "SVG") {
                                                child.style.stroke = textColor;
                                                child.style.fill = textColor;
                                                child.style.setProperty("stroke", textColor, "important");
                                                child.style.setProperty("fill", textColor, "important");
                                            }
                                        });
                                        
                                        // Handle SVG icons directly
                                        const svgs = item.querySelectorAll("svg");
                                        svgs.forEach(function(svg) {
                                            svg.style.color = textColor;
                                            svg.style.stroke = textColor;
                                            svg.style.fill = textColor;
                                            svg.style.setProperty("color", textColor, "important");
                                            svg.style.setProperty("stroke", textColor, "important");
                                            svg.style.setProperty("fill", textColor, "important");
                                        });
                                    }
                                });
                            }
                            
                            // Run immediately
                            applyBorderHighlightDesign();
                            
                            // Run after DOM is fully loaded
                            if (document.readyState === "loading") {
                                document.addEventListener("DOMContentLoaded", applyBorderHighlightDesign);
                            }
                            
                            // Single delayed run for dynamically loaded content
                            setTimeout(applyBorderHighlightDesign, 200);

                            // Debounced MutationObserver to avoid excessive DOM traversal
                            let debounceTimer = null;
                            const observer = new MutationObserver(function() {
                                if (debounceTimer) clearTimeout(debounceTimer);
                                debounceTimer = setTimeout(applyBorderHighlightDesign, 50);
                            });
                            
                            // Observe the sidebar for changes
                            const sidebar = document.querySelector(".fi-sidebar, aside");
                            if (sidebar) {
                                observer.observe(sidebar, {
                                    childList: true,
                                    subtree: true,
                                    attributes: true,
                                    attributeFilter: ["class", "style", "aria-current", "data-active"]
                                });
                            }
                            
                            // Listen for Livewire updates (Filament uses Livewire)
                            if (window.Livewire) {
                                window.Livewire.hook("morph.updated", function() {
                                    setTimeout(applyBorderHighlightDesign, 50);
                                });
                            }
                            
                            // Listen for Alpine.js updates (Filament uses Alpine.js)
                            if (window.Alpine) {
                                document.addEventListener("alpine:init", function() {
                                    setTimeout(applyBorderHighlightDesign, 100);
                                });
                            }
                        })();
                    </script>
                ',
            )
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
                \App\Http\Middleware\SetFacilityContext::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }

    /**
     * Get the current facility for branding
     */
    private function getCurrentFacility(): ?Facility
    {
        $user = Auth::user();
        if (!$user) {
            return null;
        }

        // Super admins always use default branding (HomeLogic360), never facility branding
        if ($user->role === 'super_admin') {
            return null;
        }

        // Try to get from app container (set by middleware)
        if (app()->bound('facility')) {
            return app('facility');
        }

        // Fallback to user's facility
        if ($user->facility_id) {
            return Facility::find($user->facility_id);
        }

        return null;
    }


    /**
     * Get dynamic branding configuration (evaluated per request)
     */
    private function getDynamicBranding(): array
    {
        $facility = $this->getCurrentFacility();
        return $this->getBranding($facility);
    }

    /**
     * Get dynamic colors (evaluated per request)
     */
    private function getDynamicColors(): array
    {
        $branding = $this->getDynamicBranding();
        return [
            'primary' => $branding['primary_color'],
            'success' => $branding['secondary_color'] ?? '#86EFAC', // Light green from logo
            'warning' => $branding['primary_color'], // Use primary for warnings
            'danger' => $branding['primary_color'], // Use primary for danger
            'info' => $branding['primary_color'], // Use primary for info
            'gray' => Color::Slate,
        ];
    }

    /**
     * Get branding configuration
     */
    private function getBranding(?Facility $facility): array
    {
        if (!$facility) {
            // Default branding for super admin / HomeLogic360
            return [
                'name' => 'HomeLogic360',
                'logo' => asset('images/logonew.png'),
                'primary_color' => '#1E3A5F', // Dark blue from logo
                'secondary_color' => '#86EFAC', // Light green from logo
            ];
        }

        // Use the branding accessor which handles logo_url properly
        $branding = $facility->branding;

        return [
            'name' => $branding['name'] ?? $facility->name,
            'logo' => $branding['logo'] ?? asset('images/logonew.png'),
            'primary_color' => $this->parseColor($branding['primary_color'] ?? $facility->primary_color ?? '#667eea'),
            'secondary_color' => $this->parseColor($branding['secondary_color'] ?? $facility->secondary_color ?? '#86EFAC'),
        ];
    }

    /**
     * Parse color string to Color object or hex
     */
    private function parseColor(?string $color): string
    {
        if (!$color) {
            return Color::Sky;
        }

        // If it's a valid hex color, return it
        if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color)) {
            return $color;
        }

        // Try to match Filament color names
        $colorMap = [
            'sky' => Color::Sky,
            'blue' => Color::Blue,
            'emerald' => Color::Emerald,
            'amber' => Color::Amber,
            'red' => Color::Red,
        ];

        $lowerColor = strtolower($color);
        return $colorMap[$lowerColor] ?? Color::Sky;
    }
}
