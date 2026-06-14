import React from 'react';

const VARIANT_CLASS = {
    view: 'rounded-lg border border-sky-200 bg-sky-50 p-2 shadow-sm transition hover:border-sky-300 hover:bg-sky-100 [&_svg]:!text-sky-600',
    edit: 'rounded-lg border border-amber-300 bg-amber-50 p-2 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 [&_svg]:!text-amber-700',
    delete: 'rounded-lg border border-red-200 bg-red-50 p-2 shadow-sm transition hover:border-red-300 hover:bg-red-100 [&_svg]:!text-red-600',
    resolve: 'rounded-lg border border-emerald-300 bg-emerald-50 p-2 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 [&_svg]:!text-emerald-600',
    activate: 'rounded-lg border border-emerald-300 bg-emerald-50 p-2 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 [&_svg]:!text-emerald-600',
    deactivate: 'rounded-lg border border-orange-300 bg-orange-50 p-2 shadow-sm transition hover:border-orange-400 hover:bg-orange-100 [&_svg]:!text-orange-700',
    primary: 'rounded-lg border border-[var(--theme-primary)]/40 bg-[var(--theme-primary-bg)] p-2 shadow-sm transition hover:border-[var(--theme-primary)]/60 hover:bg-[var(--theme-primary-bg)]/80 [&_svg]:!text-[var(--theme-primary)]',
};

/**
 * Bordered icon actions for entity cards (sky / amber / red / emerald / etc.).
 * Pass a Lucide icon as child, or use the icon prop.
 */
export default function CardIconButton({
    variant = 'view',
    icon: Icon,
    children,
    className = '',
    disabled,
    type = 'button',
    ...rest
}) {
    const base = VARIANT_CLASS[variant] || VARIANT_CLASS.view;
    return (
        <button
            type={type}
            disabled={disabled}
            className={`${base} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...rest}
        >
            {Icon ? <Icon className="h-4 w-4" strokeWidth={2.5} /> : children}
        </button>
    );
}
