import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/** Routes where history-back is hidden (app “home” hubs). */
export const PAGE_BACK_HIDE_MAIN_APP = ['/dashboard', '/super-admin/dashboard'];

/** Family portal index only. */
export const PAGE_BACK_HIDE_PORTAL = ['/portal'];

function normalizePathname(pathname) {
    if (!pathname) return '/';
    return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * Browser-style Back using SPA history. Hidden on configured “home” paths.
 */
export default function PageBackButton({ hideOnPaths = PAGE_BACK_HIDE_MAIN_APP }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const normalized = normalizePathname(pathname);

    const hidden = hideOnPaths.some((p) => normalizePathname(p) === normalized);
    if (hidden) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-0.5 sm:gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2 shrink-0"
            aria-label="Go back"
        >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            <span className="hidden sm:inline">Back</span>
        </button>
    );
}
