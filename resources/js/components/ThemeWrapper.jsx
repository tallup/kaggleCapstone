import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ThemeProvider } from '../contexts/ThemeContext';
import logger from '../utils/logger';
import { currentUserQueryOptions, FACILITY_BRANDING_SESSION_KEY } from '../queries/currentUser';

function hasAuthToken() {
    if (typeof window === 'undefined') return false;
    const t = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('access_token');
    return typeof t === 'string' && t.trim() !== '' && t !== 'null' && t !== 'undefined';
}

function readStashedFacilityBranding() {
    try {
        const raw = sessionStorage.getItem(FACILITY_BRANDING_SESSION_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (o && typeof o.primary_color === 'string') return o;
    } catch (e) {
        /* ignore */
    }
    return null;
}

/**
 * Wrapper component that fetches user data and provides theme
 * This ensures theme is available at the root level
 */
export default function ThemeWrapper({ children }) {
    const { data: userData, isLoading } = useQuery(currentUserQueryOptions);

    // Fetch super admin theme if user is super admin
    const isSuperAdmin = userData?.role === 'super_admin';
    const { data: superAdminTheme } = useQuery({
        queryKey: ['super-admin-theme'],
        queryFn: async () => {
            try {
                const response = await api.get('/system-settings/super-admin-theme');
                return response.data.data;
            } catch (err) {
                logger.error('Failed to fetch super admin theme:', err);
                return null;
            }
        },
        enabled: isSuperAdmin, // Only fetch if user is super admin
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        retry: 1,
    });

    // Determine facility branding
    // If super admin viewing a facility, use that facility's branding
    // Otherwise, if super admin, use super admin theme colors
    // Otherwise, use user's facility branding
    const facilityBranding = React.useMemo(() => {
        // Super admins always use HomeLogic360 branding, never facility branding
        if (isSuperAdmin) {
            // Use super admin theme if available, otherwise default HomeLogic360 branding
            if (superAdminTheme) {
                return {
                    name: 'HomeLogic360',
                    logo: superAdminTheme.logo_url || '/images/logonew.png',
                    primary_color: superAdminTheme.primary_color || '#1E3A5F',
                    secondary_color: superAdminTheme.secondary_color || '#86EFAC',
                    accent_color: superAdminTheme.accent_color || '#FFFFFF',
                };
            }
            
            // Default HomeLogic360 branding for super admin
            return {
                name: 'HomeLogic360',
                logo: '/images/logonew.png',
                primary_color: '#1E3A5F',
                secondary_color: '#86EFAC',
                accent_color: '#FFFFFF',
            };
        }
        
        // For regular users, use their facility branding.
        // While GET /user is in flight, use last known branding so we don't flash the default HomeLogic palette
        if (userData?.facility_branding) {
            return userData.facility_branding;
        }
        if (isLoading && hasAuthToken()) {
            const stashed = readStashedFacilityBranding();
            if (stashed) return stashed;
        }
        return null;
    }, [userData, isSuperAdmin, superAdminTheme, isLoading]);

    return (
        <ThemeProvider facilityBranding={facilityBranding}>
            {children}
        </ThemeProvider>
    );
}

