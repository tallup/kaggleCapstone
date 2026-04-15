/**
 * SectionLayout — persistent section navigation wrapper.
 *
 * Wraps a group of routes so that every page inside the section
 * shows the accent bar + Synkwise-style icon tab bar (title prop is for a11y labels only).
 * The active tab is determined by matching the current pathname.
 *
 * Usage:
 *   <Route element={<SectionLayout title="Clinical" tabs={TABS} />}>
 *     <Route path="clinical" element={<Overview />} />
 *     <Route path="vitals"   element={<Vitals />} />
 *   </Route>
 */
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { buildPathWithPreservedResident } from '../utils/headerResidentSwitcher';

function pathnameMatchesTab(pathname, tab) {
    if (tab.exact) {
        return pathname === tab.path;
    }
    const paths = [tab.path, ...(tab.extraPaths || [])].filter(Boolean);
    return paths.some(
        p => pathname === p || pathname.startsWith(p + '/')
    );
}

export default function SectionLayout({ title, tabs = [] }) {
    const { pathname, search } = useLocation();

    // Find the best-matching active tab (longest matching primary path wins)
    const activeTab = [...tabs]
        .filter(t => pathnameMatchesTab(pathname, t))
        .sort((a, b) => b.path.length - a.path.length)[0]
        ?? tabs[0];

    return (
        <div className="space-y-0 -mt-1">

            {/* ── Section header card ──────────────────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

                {/* Thin primary-colour accent bar */}
                <div className="h-1.5 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)]" aria-hidden="true" />

                {/* ── Tab bar (Synkwise-style: icon above label) ────────── */}
                <div className="border-t-2 border-gray-100 bg-white">
                    <div
                        className="flex overflow-x-auto scroll-smooth"
                        style={{ scrollbarWidth: 'none' }}
                        role="tablist"
                        aria-label={`${title} sections`}
                    >
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab?.id === tab.id;
                            const tabPath = tab.linkTo ?? tab.path;
                            const tabTo = buildPathWithPreservedResident(tabPath, search);
                            return (
                                <Link
                                    key={tab.id}
                                    to={tabTo}
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`
                                        relative flex flex-col items-center gap-1
                                        px-5 py-3 min-w-[80px] whitespace-nowrap
                                        motion-safe:transition-colors
                                        focus-visible:outline-none
                                        focus-visible:ring-2 focus-visible:ring-inset
                                        focus-visible:ring-[var(--theme-primary)]
                                        ${isActive
                                            ? 'text-[var(--theme-primary)]'
                                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <Icon
                                        className={`w-5 h-5 motion-safe:transition-colors ${isActive ? 'text-[var(--theme-primary)]' : 'text-gray-400'}`}
                                        aria-hidden="true"
                                    />
                                    <span className={`text-[11px] font-bold tracking-wide leading-tight text-center ${isActive ? 'text-[var(--theme-primary)]' : 'text-gray-500'}`}>
                                        {tab.label}
                                    </span>
                                    {isActive && (
                                        <span
                                            className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--theme-primary)]"
                                            aria-hidden="true"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Page content (the matched child route) ──────────────── */}
            <div className="pt-4">
                <Outlet />
            </div>

        </div>
    );
}
