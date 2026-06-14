import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * Avatar + name + meta for family portal top bar (uses resident objects from /family/care-updates).
 */
export default function PortalResidentHeader({ residents = [] }) {
  if (!residents.length) return null;

  const single = residents.length === 1 ? residents[0] : null;

  const initials = (name) => {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {single ? (
        <>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md ring-1 ring-gray-200 bg-gray-100">
            {single.profile_image_url ? (
              <img src={single.profile_image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                {initials(single.name)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate leading-tight">{single.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
              {single.branch_name && <span>{single.branch_name}</span>}
              {(single.room_number || single.room) && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                  Room {single.room_number || single.room}
                </span>
              )}
              {single.admission_date && (
                <span className="text-gray-400">Admitted {single.admission_date}</span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            {residents.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-gray-100 ring-1 ring-gray-200"
                title={r.name}
              >
                {r.profile_image_url ? (
                  <img src={r.profile_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-gray-500">
                    {initials(r.name)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {residents
                .slice(0, 2)
                .map((r) => r.name)
                .join(', ')}
              {residents.length > 2 && ` +${residents.length - 2} more`}
            </p>
            <p className="text-xs text-gray-500">{residents.length} linked residents</p>
          </div>
        </div>
      )}
    </div>
  );
}
