import React from 'react';

/**
 * Single-row "pill" for entity cards: slate background, optional Lucide icon or custom leading node (e.g. avatar).
 */
export default function DataPill({
    icon: Icon,
    leading,
    children,
    className = '',
    contentClassName = '',
}) {
    return (
        <div
            className={`flex min-w-0 items-center gap-2 rounded-lg bg-slate-50/80 px-3 py-2 text-sm text-slate-600 ${className}`}
        >
            {leading}
            {!leading && Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" /> : null}
            <div className={`min-w-0 flex-1 truncate text-slate-800 ${contentClassName}`}>{children}</div>
        </div>
    );
}

/** Uppercase micro-label + body (e.g. Description block on incident cards). */
export function DataPillSection({ label, children, className = '' }) {
    return (
        <div className={`mt-4 flex-1 ${className}`}>
            {label ? (
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            ) : null}
            <div className="mt-1 text-sm leading-relaxed text-slate-600">{children}</div>
        </div>
    );
}
