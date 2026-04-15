import React from 'react';

/**
 * Shared outer shell for list "entity" cards (Incidents, Residents, caregiver lists).
 * Top gradient bar + border/shadow/hover match the Incidents list styling.
 */
export default function EntityCardShell({ children, className = '', ...rest }) {
    return (
        <article
            className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-[0_12px_40px_rgba(15,23,42,0.1)] ${className}`.trim()}
            {...rest}
        >
            <div className="h-1 w-full bg-gradient-to-r from-[var(--theme-primary)] via-[var(--theme-primary-hover)] to-slate-300/80" />
            <div className="flex flex-1 flex-col p-5 sm:p-6">{children}</div>
        </article>
    );
}

/** Header row: meta left, action buttons right (flex wrap). */
export function EntityCardHeader({ left, right, className = '' }) {
    return (
        <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`}>
            <div className="min-w-0 flex-1 space-y-2">{left}</div>
            {right ? <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{right}</div> : null}
        </div>
    );
}
