import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const QUOTES = [
    'You do not just heal wounds; you mend spirits and give hope.',
    'Every resident deserves dignity, attention, and calm.',
    'Small moments of care add up to a life of trust.',
];

/**
 * Full-viewport loading state for dashboard first paint after login.
 */
export default function DashboardLoadingSplash() {
    const { primary, secondary } = useTheme();
    const [quoteIndex] = React.useState(() => Math.floor(Math.random() * QUOTES.length));

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 px-6"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading dashboard"
        >
            <div className="flex max-w-md flex-col items-center text-center">
                <div
                    className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl shadow-md"
                    style={{
                        background: primary
                            ? `linear-gradient(135deg, ${primary}, ${secondary || primary})`
                            : 'linear-gradient(135deg, #25603E, #1e4628)',
                    }}
                >
                    <img
                        src="/images/logonew.png"
                        alt=""
                        className="h-10 w-10 object-contain"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>
                <p className="font-serif text-lg leading-relaxed text-slate-700">
                    {QUOTES[quoteIndex]}
                </p>
                <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Preparing your workspace
                </p>
                <div className="mt-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--theme-primary,#25603E)]" />
            </div>
        </div>
    );
}
