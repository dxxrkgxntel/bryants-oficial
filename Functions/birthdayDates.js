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

module.exports = { getZonedDateParts, getNextZonedDateParts };
