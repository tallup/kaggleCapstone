import React from 'react';

function initialsFromResident(resident) {
    const a = resident?.first_name?.[0] ?? '';
    const b = resident?.last_name?.[0] ?? '';
    return `${a}${b}`.toUpperCase() || '?';
}

/**
 * Small circular avatar for entity card pills (incidents, lists).
 */
export default function ResidentAvatarInline({ resident, className = 'h-8 w-8 text-[10px]' }) {
    if (!resident) return null;
    const url =
        resident.profile_image_url ||
        (resident.profile_image ? `/storage/${resident.profile_image}` : null);
    const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(' ');
    const [showImg, setShowImg] = React.useState(!!url);

    return (
        <div
            className={`relative shrink-0 overflow-hidden rounded-full border border-slate-200/90 bg-[var(--theme-primary)] font-bold uppercase text-[var(--theme-text-on-primary)] ${className} flex items-center justify-center`}
        >
            {url && showImg ? (
                <img
                    src={url}
                    alt={fullName || 'Resident'}
                    className="h-full w-full object-cover"
                    onError={() => setShowImg(false)}
                />
            ) : (
                <span>{initialsFromResident(resident)}</span>
            )}
        </div>
    );
}
