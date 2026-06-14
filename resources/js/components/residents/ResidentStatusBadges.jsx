import React from 'react';
import { getResidentStatusSummary } from '../../utils/residentStatus';

const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
};

function StatusBadge({ children, className = '', size = 'sm', prefix }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wide ${sizeClasses[size] || sizeClasses.sm} ${className}`}
        >
            {prefix ? <span className="mr-1 font-semibold opacity-70">{prefix}</span> : null}
            {children}
        </span>
    );
}

export default function ResidentStatusBadges({
    resident,
    className = '',
    size = 'sm',
    showTemporary = true,
    showCensus = false,
    temporaryPrefix = 'Temp:',
}) {
    const { lifecycleMeta, temporaryMeta, isInCensus } = getResidentStatusSummary(resident);

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            <StatusBadge className={lifecycleMeta.badgeClassName} size={size}>
                {lifecycleMeta.label}
            </StatusBadge>
            {showTemporary && temporaryMeta ? (
                <StatusBadge className={temporaryMeta.badgeClassName} size={size} prefix={temporaryPrefix}>
                    {temporaryMeta.label}
                </StatusBadge>
            ) : null}
            {showCensus ? (
                <StatusBadge
                    className={
                        isInCensus
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                    }
                    size={size}
                >
                    {isInCensus ? 'In Census' : 'Out of Census'}
                </StatusBadge>
            ) : null}
        </div>
    );
}
