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

const pacificTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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
    
    // If a date is provided, we need to convert it to Pacific time using the formatter
    const target = date ? new Date(date) : getReferenceDate();
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
    const { year, month, day } = getPacificParts(date);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

export const formatPacificDate = (date) => {
    // If no date provided and we have a server reference, format directly from components
    if (!date && pacificServerReference && pacificReferencePerformance !== null) {
        const parts = getPacificParts();
        return formatFromPacificComponents(parts, pacificDateFormatter);
    }
    return pacificDateFormatter.format(resolveDateInput(date));
};

export const formatPacificTime = (date) => {
    // If no date provided and we have a server reference, format directly from components
    if (!date && pacificServerReference && pacificReferencePerformance !== null) {
        const parts = getPacificParts();
        return formatFromPacificComponents(parts, pacificTimeFormatter);
    }
    return pacificTimeFormatter.format(resolveDateInput(date));
};

export const getPacificNow = () => getPacificDate();

const createPacificInstant = (year, month, day, hour = 0, minute = 0, second = 0) => {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const offsetMinutes = parseOffsetMinutes('-08:00') ?? -480;
    return new Date(utcGuess - offsetMinutes * 60 * 1000);
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

    const referenceParts = getPacificParts(referenceDate);
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
            return resolveDayOffset(
                createPacificInstant(referenceParts.year, referenceParts.month, referenceParts.day, hours, minutes)
            );
        }
    }

    const parsed = new Date(timeValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return resolveDayOffset(getPacificDate(parsed));
};

export const formatPacificTimeValue = (timeValue) => {
    const pacificDate = toPacificDateFromTime(timeValue);
    return pacificDate ? formatPacificTime(pacificDate) : null;
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
        console.error('Failed to compute timezone display parts', error);
        return { shortName: '', offset: '' };
    }
};

export const PACIFIC_TIMEZONE_ID = PACIFIC_TIMEZONE;

