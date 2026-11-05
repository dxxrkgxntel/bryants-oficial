function getZonedDateParts(date = new Date(), timeZone = "America/Santo_Domingo") {
    const value = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(value.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric"
    }).formatToParts(value);
    const values = Object.fromEntries(parts.map(part => [part.type, Number(part.value)]));
    return { year: values.year, month: values.month, day: values.day };
}

function getNextZonedDateParts(date = new Date(), timeZone = "America/Santo_Domingo") {
    const current = getZonedDateParts(date, timeZone);
    if (!current) return null;
    const nextDate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1, 12));
    return getZonedDateParts(nextDate, timeZone);
}

function formatZonedDateString(parts) {
    if (!parts) return null;
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(date);
    const month = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(date);
    return `${weekday} ${month} ${parts.day} ${parts.year}`;
}

function getZonedDateString(date = new Date(), timeZone = "America/Santo_Domingo") {
    return formatZonedDateString(getZonedDateParts(date, timeZone));
}

function getAdjacentZonedDateString(date = new Date(), dayOffset = 0, timeZone = "America/Santo_Domingo") {
    const current = getZonedDateParts(date, timeZone);
    if (!current || !Number.isInteger(dayOffset)) return null;
    const adjacent = new Date(Date.UTC(current.year, current.month - 1, current.day + dayOffset, 12));
    return formatZonedDateString(getZonedDateParts(adjacent, timeZone));
}

module.exports = { getZonedDateParts, getNextZonedDateParts, getZonedDateString, getAdjacentZonedDateString };
