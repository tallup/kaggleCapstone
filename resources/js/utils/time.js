const PACIFIC_TIMEZONE = 'America/Los_Angeles';

let serverTimeOffsetMs = 0;

export const setServerTimeReference = (isoString) => {
    if (!isoString) {
        serverTimeOffsetMs = 0;
        return;
    }

    const reference = Date.parse(isoString);
    if (Number.isNaN(reference)) {
        serverTimeOffsetMs = 0;
        return;
    }

    serverTimeOffsetMs = reference - Date.now();
};

export const getServerNow = () => new Date(Date.now() + serverTimeOffsetMs);

export const pacificDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
});

export const pacificDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
});

export const pacificTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
});

export const pacificOffsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIMEZONE,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
});

export const getPacificParts = (date = getServerNow()) => {
    const parts = pacificDateTimeFormatter.formatToParts(date);
    const lookup = {};
    parts.forEach(({ type, value }) => {
        if (type !== 'literal') {
            lookup[type] = Number(value);
        }
    });
    return lookup;
};

export const getPacificDate = (date = getServerNow()) => {
    const { year, month, day, hour = 0, minute = 0, second = 0 } = getPacificParts(date);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

export const getPacificStartOfDay = (date = getServerNow()) => {
    const { year, month, day } = getPacificParts(date);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
};

export const getPacificISODate = (date = getServerNow()) => {
    const { year, month, day } = getPacificParts(date);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const formatPacificTime = (date) => pacificTimeFormatter.format(date);
export const formatPacificDate = (date) => pacificDateFormatter.format(date);
export const getPacificNow = () => getPacificDate(getServerNow());

export const toLocalISOStringFromPacific = (pacificDate) => {
    if (!pacificDate || Number.isNaN(pacificDate.getTime())) return '';
    const localEquivalent = new Date(pacificDate.getTime() - pacificDate.getTimezoneOffset() * 60000);
    return localEquivalent.toISOString();
};

export const getPacificDateTimeLocalString = (date = getServerNow()) =>
    toLocalISOStringFromPacific(getPacificDate(date)).slice(0, 16);

export const getPacificISODateTime = (date = getServerNow()) => getPacificDate(date).toISOString();

export const getPacificOffsetMinutes = (date = getServerNow()) => {
    const parts = pacificOffsetFormatter.formatToParts(date);
    const tzPart = parts.find(({ type }) => type === 'timeZoneName')?.value || 'GMT-8';
    const match = tzPart.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/i);
    if (!match) return -480;
    const hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) : 0;
    return hours * 60 + Math.sign(hours) * minutes;
};

export const createPacificInstant = (year, month, day, hour = 0, minute = 0, second = 0) => {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const offsetMinutes = getPacificOffsetMinutes(new Date(utcGuess));
    return new Date(utcGuess - offsetMinutes * 60 * 1000);
};

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

export const toPacificDateFromTime = (timeValue, { referenceDate = getPacificNow(), dayOffset = 0 } = {}) => {
    if (!timeValue) return null;

    const adjustDay = (date) => {
        if (dayOffset) {
            date.setUTCDate(date.getUTCDate() + dayOffset);
        }
        return date;
    };

    if (typeof timeValue === 'string') {
        if (timeValue.includes('T') || timeValue.includes(' ')) {
            const parsed = new Date(timeValue);
            if (Number.isNaN(parsed.getTime())) return null;
            return adjustDay(getPacificDate(parsed));
        }

        const timeMatch = timeValue.match(/^(\d{2}):(\d{2})/);
        if (timeMatch) {
            const [_, hoursStr, minutesStr] = timeMatch;
            const hours = Number(hoursStr);
            const minutes = Number(minutesStr);

            if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

            const base = getPacificStartOfDay(referenceDate);
            base.setUTCHours(hours, minutes, 0, 0);
            return adjustDay(base);
        }
    }

    const parsed = new Date(timeValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return adjustDay(getPacificDate(parsed));
};

export const formatPacificTimeValue = (timeValue) => {
    const pacificDate = toPacificDateFromTime(timeValue);
    return pacificDate ? formatPacificTime(pacificDate) : null;
};

export const getPacificDayIdentifier = (date = getPacificNow()) => {
    const { year, month, day } = getPacificParts(date);
    return { year, month, day };
};

