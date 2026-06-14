import logger from './logger';

const PACIFIC_TIMEZONE = 'America/Los_Angeles';

const pacificDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
});

const pacificDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
});

let pacificServerReference = null;
let pacificReferencePerformance = null;

const getPerformanceNow = () => {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
};

const parseOffsetMinutes = (offsetString) => {
    if (!offsetString) return null;
    const match = offsetString.match(/^([+-])(\d{2}):?(\d{2})?$/);
    if (!match) return null;
    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? '0');
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return sign * (hours * 60 + minutes);
};

export const setPacificServerTime = (isoString, offsetString) => {
    if (!isoString) return;
    const reference = new Date(isoString);
    if (Number.isNaN(reference.getTime())) {
        return;
    }

    const isoOffsetMatch = isoString.match(/([+-]\d{2}:\d{2}|Z)$/i);
    let isoOffsetMinutes = 0;
    if (isoOffsetMatch) {
        if (isoOffsetMatch[1].toUpperCase() === 'Z') {
            isoOffsetMinutes = 0;
        } else {
            isoOffsetMinutes = parseOffsetMinutes(isoOffsetMatch[1]) ?? 0;
        }
    }

    // The API returns time in Pacific timezone (e.g., "02:33:28-08:00" means 2:33 AM Pacific)
    // JavaScript parses this and stores it as UTC internally (e.g., 10:33:28 UTC)
    // We want to store it so that UTC components = Pacific components
    // So we need to subtract 8 hours: 10:33:28 UTC - 8 hours = 02:33:28 UTC
    // Since isoOffsetMinutes is -480 (negative), we ADD it to subtract: +(-480) = -480 minutes
    // Now when we extract UTC components, we get 02:33:28, which is the Pacific time
    pacificServerReference = new Date(reference.getTime() + isoOffsetMinutes * 60 * 1000);
    pacificReferencePerformance = getPerformanceNow();
};

const getReferenceDate = () => {
    if (pacificServerReference && pacificReferencePerformance !== null) {
        const elapsed = getPerformanceNow() - pacificReferencePerformance;
        return new Date(pacificServerReference.getTime() + elapsed);
    }
    return new Date();
};

// Extract Pacific time components directly from a Date that already represents Pacific time
// This is used when we have a server reference that's already adjusted to Pacific time
const extractPacificComponentsFromReference = (date) => {
    // The pacificServerReference stores time in a way where UTC components = Pacific components
    // So we extract UTC components and treat them as Pacific time
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth() + 1;
    const utcDay = date.getUTCDate();
    const utcHour = date.getUTCHours();
    const utcMinute = date.getUTCMinutes();
    const utcSecond = date.getUTCSeconds();
    
    return {
        year: utcYear,
        month: utcMonth,
        day: utcDay,
        hour: utcHour,
        minute: utcMinute,
        second: utcSecond,
    };
};

export const getPacificParts = (date) => {
    // If no date provided and we have a server reference, use it directly
    if (!date && pacificServerReference && pacificReferencePerformance !== null) {
        const referenceDate = getReferenceDate();
        return extractPacificComponentsFromReference(referenceDate);
    }
    
    // If a date is provided, check if it's from our server reference system
    // (Dates created by createPacificInstant or getPacificDate have UTC components = Pacific components)
    const target = date ? new Date(date) : getReferenceDate();
    
    // If we have a server reference, check if this date is likely from our system
    // (i.e., it's a Date object that might already have UTC = Pacific components)
    // For dates created by our system, extract UTC components directly
    if (pacificServerReference && pacificReferencePerformance !== null) {
        // Extract UTC components directly (they represent Pacific time in our system)
        return {
            year: target.getUTCFullYear(),
            month: target.getUTCMonth() + 1,
            day: target.getUTCDate(),
            hour: target.getUTCHours(),
            minute: target.getUTCMinutes(),
            second: target.getUTCSeconds(),
        };
    }
    
    // No server reference - use formatter to convert to Pacific time
    const parts = pacificDateTimeFormatter.formatToParts(target);
    const lookup = {};
    parts.forEach(({ type, value }) => {
        if (type !== 'literal') {
            lookup[type] = Number(value);
        }
    });
    return {
        year: lookup.year,
        month: lookup.month,
        day: lookup.day,
        hour: lookup.hour ?? 0,
        minute: lookup.minute ?? 0,
        second: lookup.second ?? 0,
    };
};

export const getPacificDate = (date) => {
    const { year, month, day, hour, minute, second } = getPacificParts(date);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

export const getPacificStartOfDay = (date) => {
    const { year, month, day } = getPacificParts(date);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

export const getPacificISODate = (date) => {
    // If no date provided, get today's date in Pacific timezone
    if (!date) {
        // If we have a server reference, extract UTC components directly
        // (The server reference is already adjusted so UTC components = Pacific components)
        if (pacificServerReference && pacificReferencePerformance !== null) {
            const referenceDate = getReferenceDate();
            // Extract UTC components directly - they represent Pacific time in our system
            const year = referenceDate.getUTCFullYear();
            const month = referenceDate.getUTCMonth() + 1;
            const day = referenceDate.getUTCDate();
            const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return result;
        }
        
        // No server reference - use formatter to convert current local time to Pacific
        const now = new Date();
        const parts = pacificDateFormatter.formatToParts(now);
        const lookup = {};
        parts.forEach(({ type, value }) => {
            if (type !== 'literal') {
                lookup[type] = Number(value);
            }
        });
        const year = lookup.year;
        const month = lookup.month;
        const day = lookup.day;
        const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return result;
    }
    
    // If date is provided, use getPacificParts to extract date components
    const { year, month, day } = getPacificParts(date);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Parse a date string (YYYY-MM-DD) and treat it as a Pacific date directly
export const parsePacificDateString = (dateString) => {
    if (!dateString) return null;
    
    // If it's already a Date object, extract components directly
    if (dateString instanceof Date) {
        if (Number.isNaN(dateString.getTime())) return null;
        // Extract UTC components and treat as Pacific (no conversion)
        const year = dateString.getUTCFullYear();
        const month = dateString.getUTCMonth() + 1;
        const day = dateString.getUTCDate();
        return createPacificInstant(year, month, day, 0, 0, 0);
    }
    
    // Handle string formats
    if (typeof dateString !== 'string') {
        return null;
    }
    
    // Parse YYYY-MM-DD format (may have time part like "2025-12-12T00:00:00.000000Z")
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
        // Try parsing as full date string and extract date part
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return null;
        const year = parsed.getUTCFullYear();
        const month = parsed.getUTCMonth() + 1;
        const day = parsed.getUTCDate();
        return createPacificInstant(year, month, day, 0, 0, 0);
    }
    
    const [, yearStr, monthStr, dayStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        return null;
    }
    
    // Create a Pacific date directly (treating the date string as Pacific time)
    return createPacificInstant(year, month, day, 0, 0, 0);
};

const resolveDateInput = (date) => {
    if (date instanceof Date) {
        return date;
    }
    if (date) {
        const parsed = new Date(date);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return getReferenceDate();
};

// Format time/date directly from Pacific components (no timezone conversion)
const formatFromPacificComponents = (parts, formatter) => {
    const { year, month, day, hour, minute, second } = parts;
    // Create a UTC Date from Pacific components (since we're treating UTC = Pacific)
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    // Format using UTC (no timezone conversion)
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
        ...formatter.resolvedOptions(),
        timeZone: 'UTC',
    });
    return utcFormatter.format(utcDate);
};

/** Always "h:mm AM/PM" — never rely on Intl full-string time (Safari/mobile may say "in the morning" / "at night"). */
const formatHourMinute24ToAmPm = (hour24, minute) => {
    const h = ((Math.floor(hour24) % 24) + 24) % 24;
    const m = ((Math.floor(minute) % 60) + 60) % 60;
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/** Pacific wall-clock hour (0–23) and minute from a real Date, via explicit 24h parts (no dayPeriod strings). */
const getPacificHourMinute24 = (date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: PACIFIC_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const lookup = {};
    parts.forEach(({ type, value }) => {
        if (type !== 'literal') {
            lookup[type] = Number(value);
        }
    });
    return {
        hour: Number.isFinite(lookup.hour) ? lookup.hour : 0,
        minute: Number.isFinite(lookup.minute) ? lookup.minute : 0,
    };
};

/** Pacific wall-clock hour (0–23) and minute from a real absolute instant (e.g. API ISO datetime). */
export const getPacificHourMinute24FromInstant = (value) => {
    const inst = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(inst.getTime())) {
        return { hour: 0, minute: 0 };
    }
    return getPacificHourMinute24(inst);
};

/** "h:mm AM/PM" for a real UTC/ISO instant, in America/Los_Angeles (use for API timestamps, not fake-UTC dates). */
export const formatPacificTimeFromInstant = (value) => {
    if (!value) return '';
    const { hour, minute } = getPacificHourMinute24FromInstant(value);
    return formatHourMinute24ToAmPm(hour, minute);
};

/** Pacific wall-clock hour 0–23 from an API ISO instant (for sorting / AM–PM buckets). */
export const getPacificHourFromInstant = (value) => getPacificHourMinute24FromInstant(value).hour;

export const formatPacificDate = (date) => {
    // If no date provided and we have a server reference, format directly from components
    if (!date && pacificServerReference && pacificReferencePerformance !== null) {
        const parts = getPacificParts();
        return formatFromPacificComponents(parts, pacificDateFormatter);
    }
    
    // If date is provided, extract components directly to avoid timezone conversion
    if (date) {
        // If it's a Date object created by parsePacificDateString, extract UTC components directly
        // (they represent Pacific components in our system)
        if (date instanceof Date) {
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();
            // Format directly without timezone conversion
            return `${month}/${day}/${year}`;
        }
        
        // If it's a string in YYYY-MM-DD format, parse and format directly
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
            const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const [, yearStr, monthStr, dayStr] = match;
                const month = Number(monthStr);
                const day = Number(dayStr);
                const year = Number(yearStr);
                return `${month}/${day}/${year}`;
            }
        }
    }
    
    // Fallback to formatter (shouldn't reach here for date strings)
    return pacificDateFormatter.format(resolveDateInput(date));
};

/**
 * "Apr 6, 1989" style for calendar-only API values (YYYY-MM-DD or Laravel `...T00:00:00.000000Z`).
 * Do not use `new Date(str)` + local `Intl` for these — the day can shift vs stored calendar date.
 */
export const formatPacificCalendarMedium = (value) => {
    if (!value) return 'N/A';
    const parsed = parsePacificDateString(value);
    if (!parsed || Number.isNaN(parsed.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(parsed);
};

/** Full years from birth date string; "today" uses Pacific wall clock via getPacificParts. */
export const calculateAgeFromPacificBirthDate = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birth = parsePacificDateString(dateOfBirth);
    if (!birth || Number.isNaN(birth.getTime())) return null;
    const birthYear = birth.getUTCFullYear();
    const birthMonth = birth.getUTCMonth() + 1;
    const birthDay = birth.getUTCDate();
    const { year: y, month: m, day: d } = getPacificParts(new Date());
    let age = y - birthYear;
    if (m < birthMonth || (m === birthMonth && d < birthDay)) {
        age -= 1;
    }
    return age;
};

/** Instant (e.g. updated_at) formatted in Pacific for display. */
export const formatPacificDateTimeShort = (value) => {
    if (!value) return 'N/A';
    const inst = new Date(value);
    if (Number.isNaN(inst.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: PACIFIC_TIMEZONE,
    }).format(inst);
};

export const formatPacificTime = (date) => {
    // Server-synced clock: Pacific components live in UTC fields of our reference Date
    if (!date && pacificServerReference && pacificReferencePerformance !== null) {
        const parts = getPacificParts();
        return formatHourMinute24ToAmPm(parts.hour, parts.minute);
    }

    if (date && pacificServerReference && pacificReferencePerformance !== null) {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (!Number.isNaN(dateObj.getTime())) {
            const hours = dateObj.getUTCHours();
            const minutes = dateObj.getUTCMinutes();
            return formatHourMinute24ToAmPm(hours, minutes);
        }
    }

    // Real-world Date in local storage → derive Pacific hour/minute with 24h numeric parts only
    const d = resolveDateInput(date);
    const { hour, minute } = getPacificHourMinute24(d);
    return formatHourMinute24ToAmPm(hour, minute);
};

export const getPacificNow = () => getPacificDate();

const createPacificInstant = (year, month, day, hour = 0, minute = 0, second = 0) => {
    // Create a UTC date directly - in our system, UTC components = Pacific components
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

export const getPacificDateTimeLocalString = (date) => {
    const pacificDate = getPacificDate(date);
    const localEquivalent = new Date(pacificDate.getTime() - pacificDate.getTimezoneOffset() * 60000);
    return localEquivalent.toISOString().slice(0, 16);
};

export const getPacificISODateTime = (date) => getPacificDate(date).toISOString();

export const convertPacificLocalInputToISO = (value) => {
    if (!value) return value;
    const [datePart, timePart = ''] = value.split('T');
    if (!datePart) return value;
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0] = timePart.split(':').map(Number);
    if ([year, month, day].some((n) => Number.isNaN(n)) || Number.isNaN(hour) || Number.isNaN(minute)) {
        return value;
    }
    return createPacificInstant(year, month, day, hour, minute).toISOString();
};

export const toPacificDateFromTime = (timeValue, { referenceDate, dayOffset = 0 } = {}) => {
    if (!timeValue) return null;

    // Get reference date - use getPacificNow() if not provided
    const refDate = referenceDate || getPacificNow();
    
    // Extract Pacific date components directly from the reference date
    // Always use getPacificParts to ensure consistent extraction
    // It will handle server reference dates correctly
    const referenceParts = getPacificParts(refDate);
    
    const resolveDayOffset = (date) => {
        if (dayOffset) {
            date.setUTCDate(date.getUTCDate() + dayOffset);
        }
        return date;
    };

    if (typeof timeValue === 'string') {
        if (timeValue.includes('T') || timeValue.includes(' ')) {
            const parsed = new Date(timeValue);
            if (Number.isNaN(parsed.getTime())) return null;
            return resolveDayOffset(getPacificDate(parsed));
        }

        const timeMatch = timeValue.match(/^(\d{2}):(\d{2})/);
        if (timeMatch) {
            const [_, hoursStr, minutesStr] = timeMatch;
            const hours = Number(hoursStr);
            const minutes = Number(minutesStr);
            if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
            
            // Create the date with the correct day (apply dayOffset to the day component)
            let targetDay = referenceParts.day + dayOffset;
            let targetMonth = referenceParts.month;
            let targetYear = referenceParts.year;
            
            // Handle day overflow/underflow
            if (targetDay < 1) {
                targetMonth--;
                if (targetMonth < 1) {
                    targetMonth = 12;
                    targetYear--;
                }
                const daysInPrevMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
                targetDay = daysInPrevMonth + targetDay;
            } else {
                const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
                if (targetDay > daysInMonth) {
                    targetDay = targetDay - daysInMonth;
                    targetMonth++;
                    if (targetMonth > 12) {
                        targetMonth = 1;
                        targetYear++;
                    }
                }
            }
            
            return createPacificInstant(targetYear, targetMonth, targetDay, hours, minutes);
        }
    }

    const parsed = new Date(timeValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return resolveDayOffset(getPacificDate(parsed));
};

export const formatPacificTimeValue = (timeValue) => {
    if (!timeValue) return null;
    
    // If it's a time string like "03:00:00" or "03:00", parse it directly
    if (typeof timeValue === 'string') {
        // Try to match time pattern at the start or extract from datetime string
        // Pattern 1: Simple time "03:00" or "03:00:00"
        // Pattern 2: Time in datetime string "2025-11-12T03:00:00" - extract time part
        let timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
        if (!timeMatch && timeValue.includes('T')) {
            // Try to extract time from ISO datetime string
            const timePart = timeValue.split('T')[1];
            if (timePart) {
                timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
            }
        }
        
        if (timeMatch) {
            const [, hoursStr, minutesStr] = timeMatch;
            const hours = Number(hoursStr);
            const minutes = Number(minutesStr);
            if (!Number.isNaN(hours) && !Number.isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                // Format directly without timezone conversion
                const hour12 = hours % 12 || 12;
                const ampm = hours < 12 ? 'AM' : 'PM';
                const minutesPadded = String(minutes).padStart(2, '0');
                return `${hour12}:${minutesPadded} ${ampm}`;
            }
        }
    }
    
    // Fallback to the original method for datetime strings
    const pacificDate = toPacificDateFromTime(timeValue);
    if (!pacificDate) return null;
    
    // If we have a server reference, format directly from UTC components (no conversion)
    if (pacificServerReference && pacificReferencePerformance !== null) {
        const hours = pacificDate.getUTCHours();
        const minutes = pacificDate.getUTCMinutes();
        const hour12 = hours % 12 || 12;
        const ampm = hours < 12 ? 'AM' : 'PM';
        const minutesPadded = String(minutes).padStart(2, '0');
        return `${hour12}:${minutesPadded} ${ampm}`;
    }
    
    return formatPacificTime(pacificDate);
};

export const getPacificDayIdentifier = (date) => {
    const { year, month, day } = getPacificParts(date);
    return { year, month, day };
};

export const getTimezoneDisplayParts = (timeZone = PACIFIC_TIMEZONE) => {
    try {
        const now = getPacificDate();
        const shortName =
            new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
                .formatToParts(now)
                .find((part) => part.type === 'timeZoneName')
                ?.value || '';
        const offsetName =
            new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
                .formatToParts(now)
                .find((part) => part.type === 'timeZoneName')
                ?.value || '';
        const normalizedOffset = offsetName.replace(/^GMT/, 'UTC');
        return { shortName, offset: normalizedOffset };
    } catch (error) {
        logger.error('Failed to compute timezone display parts', error);
        return { shortName: '', offset: '' };
    }
};

export const PACIFIC_TIMEZONE_ID = PACIFIC_TIMEZONE;

/**
 * Get today's date as YYYY-MM-DD string in local timezone (not UTC)
 * This prevents timezone offset issues when setting default dates in forms
 */
export const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

