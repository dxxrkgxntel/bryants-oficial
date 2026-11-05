const { getZonedDateString, getAdjacentZonedDateString } = require("./birthdayDates");

function calculateCalendarStreak(currentStreak = 0, lastDate = null, now = new Date()) {
    const today = getZonedDateString(now);
    const yesterday = getAdjacentZonedDateString(now, -1);
    let streak = Math.max(0, Number(currentStreak) || 0);
    if (lastDate === yesterday) streak += 1;
    else if (lastDate !== today) streak = 1;
    return { streak, today };
}

module.exports = { calculateCalendarStreak };
