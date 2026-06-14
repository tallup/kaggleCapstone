import React from 'react';
import { AlertTriangle, Utensils, MapPin, ShieldAlert, Stethoscope } from 'lucide-react';
import { calculateAgeFromPacificBirthDate } from '../../utils/pacificTime';
import { slideInUp, shouldAnimate } from '../../utils/animationPresets';

/**
 * Compact clinical context banner shown above tab content on all resident-specific pages.
 * Gives caregivers instant safety context (allergies, diet, code status, room) without
 * navigating back to the profile tab.
 */
export default function ResidentSafetyStrip({ resident, isLoading }) {
    const stripRef = React.useRef(null);

    // Entrance animation on mount
    React.useEffect(() => {
        if (stripRef.current && shouldAnimate()) {
            slideInUp(stripRef.current, { duration: 300, delay: 50 });
        }
    }, []);

    if (isLoading) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm" aria-busy="true">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-5 w-32 animate-pulse rounded-full bg-gray-200" />
                </div>
            </div>
        );
    }

    if (!resident) return null;

    const allergies = (() => {
        if (!resident.allergies) return [];
        if (Array.isArray(resident.allergies)) return resident.allergies.filter(Boolean);
        if (typeof resident.allergies === 'string' && resident.allergies.trim()) return [resident.allergies];
        return [];
    })();

    const age = calculateAgeFromPacificBirthDate(resident.date_of_birth);
    const room = resident.room_number || resident.room;
    const diet = resident.diet;
    const codeStatus = resident.code_status;
    const diagnosis = resident.diagnosis;

    const hasAnyInfo = allergies.length > 0 || diet || codeStatus || room || diagnosis;
    if (!hasAnyInfo && age === null) return null;

    return (
        <div
            ref={stripRef}
            role="region"
            aria-label="Resident clinical summary"
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
        >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">

                {/* Allergies — always prominent */}
                {allergies.length > 0 ? (
                    <div className="flex items-center gap-1.5" aria-label={`Allergies: ${allergies.join(', ')}`}>
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-red-600">Allergies:</span>
                        <div className="flex flex-wrap gap-1" role="list">
                            {allergies.map((allergy, i) => (
                                <span
                                    key={i}
                                    role="listitem"
                                    className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200"
                                >
                                    {allergy}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-gray-400" aria-label="No known allergies">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span className="text-xs">No known allergies</span>
                    </div>
                )}

                <Divider />

                {/* Room */}
                {room && (
                    <>
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                            <span className="text-xs font-medium text-gray-500">Room:</span>
                            <span className="text-xs font-semibold text-gray-800">{room}</span>
                        </div>
                        <Divider />
                    </>
                )}

                {/* Diet */}
                {diet && (
                    <>
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <Utensils className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                            <span className="text-xs font-medium text-gray-500">Diet:</span>
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                {diet}
                            </span>
                        </div>
                        <Divider />
                    </>
                )}

                {/* Code Status */}
                {codeStatus && (
                    <>
                        <div className="flex items-center gap-1.5">
                            <ShieldAlert className="h-4 w-4 flex-shrink-0 text-blue-500" aria-hidden="true" />
                            <span className="text-xs font-medium text-gray-500">Code:</span>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                {codeStatus}
                            </span>
                        </div>
                        <Divider />
                    </>
                )}

                {/* Diagnosis — truncated with full text accessible via title */}
                {diagnosis && (
                    <div className="flex min-w-0 items-center gap-1.5">
                        <Stethoscope className="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
                        <span className="text-xs font-medium text-gray-500">Dx:</span>
                        <span
                            className="max-w-[200px] truncate text-xs text-gray-700"
                            title={diagnosis}
                            aria-label={`Diagnosis: ${diagnosis}`}
                        >
                            {diagnosis}
                        </span>
                    </div>
                )}

                {/* Age — right-aligned */}
                {age !== null && (
                    <div className="ml-auto flex-shrink-0 text-xs text-gray-400" aria-label={`Age: ${age} years`}>
                        {age} yrs old
                    </div>
                )}
            </div>
        </div>
    );
}

function Divider() {
    return <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden="true" />;
}
