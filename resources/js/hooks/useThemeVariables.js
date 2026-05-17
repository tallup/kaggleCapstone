import { useLayoutEffect } from 'react';
import { lightenColor, darkenColor, addOpacity, getContrastColor, ensureContrast, getTextColorForWhite } from '../utils/colorUtils';

/**
 * Imperatively set the --theme-* CSS variables on document.documentElement.
 * Pure DOM mutation; safe to call from event handlers (e.g. immediately after login)
 * so the first paint of the next route shows facility colors regardless of React render timing.
 */
export function applyThemeCssVariables(theme) {
    if (!theme || typeof document === 'undefined') return;

    const root = document.documentElement;
    const {
        primary_color = '#E0F2FE', // Light blue/sky
        secondary_color = '#F0FDF4', // Very light green
        accent_color = '#FFFFFF', // White
    } = theme;

    root.style.setProperty('--theme-primary', primary_color);
    root.style.setProperty('--theme-primary-hover', darkenColor(primary_color, 10));
    root.style.setProperty('--theme-primary-light', lightenColor(primary_color, 20));
    root.style.setProperty('--theme-primary-dark', darkenColor(primary_color, 15));
    root.style.setProperty('--theme-primary-lighter', lightenColor(primary_color, 30));
    root.style.setProperty('--theme-primary-lightest', lightenColor(primary_color, 40));

    root.style.setProperty('--theme-secondary', secondary_color);
    root.style.setProperty('--theme-secondary-hover', darkenColor(secondary_color, 10));
    root.style.setProperty('--theme-secondary-light', lightenColor(secondary_color, 20));
    root.style.setProperty('--theme-secondary-dark', darkenColor(secondary_color, 15));

    root.style.setProperty('--theme-accent', accent_color);
    root.style.setProperty('--theme-accent-light', lightenColor(accent_color, 10));

    root.style.setProperty('--theme-primary-bg', addOpacity(primary_color, 0.1));
    root.style.setProperty('--theme-primary-bg-light', addOpacity(primary_color, 0.05));
    root.style.setProperty('--theme-secondary-bg', addOpacity(secondary_color, 0.1));

    root.style.setProperty('--theme-border', addOpacity(primary_color, 0.2));
    root.style.setProperty('--theme-border-light', addOpacity(primary_color, 0.1));

    root.style.setProperty('--theme-text-primary', primary_color);
    root.style.setProperty('--theme-text-secondary', secondary_color);
    root.style.setProperty('--theme-text-on-primary', getContrastColor(primary_color));
    root.style.setProperty('--theme-text-on-secondary', getContrastColor(secondary_color));
    root.style.setProperty('--theme-text-on-accent', getContrastColor(accent_color));
    // Text color on white backgrounds — always ensures dark, visible color even with light theme colors
    root.style.setProperty('--theme-text-on-white', getTextColorForWhite(primary_color));

    root.style.setProperty('--theme-focus-ring', addOpacity(primary_color, 0.5));
}

/**
 * Hook to set CSS custom properties (CSS variables) on the document root
 * Updates when theme colors change
 */
export function useThemeVariables(theme) {
    // useLayoutEffect: apply CSS variables before the browser paints so the first frame matches React theme state
    useLayoutEffect(() => {
        applyThemeCssVariables(theme);
    }, [theme]);
}

