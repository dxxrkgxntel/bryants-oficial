const assert = require("node:assert/strict");
const { calculateCalendarStreak } = require("../Functions/calendarStreak");

const first = calculateCalendarStreak(0, null, new Date("2026-11-06T04:00:00.000Z"));
assert.deepEqual(first, { streak: 1, today: "Fri Nov 6 2026" });

const sameDay = calculateCalendarStreak(4, "Fri Nov 6 2026", new Date("2026-11-06T18:00:00.000Z"));
assert.deepEqual(sameDay, { streak: 4, today: "Fri Nov 6 2026" });

const nextDay = calculateCalendarStreak(4, "Fri Nov 6 2026", new Date("2026-11-07T04:00:00.000Z"));
assert.deepEqual(nextDay, { streak: 5, today: "Sat Nov 7 2026" });

const broken = calculateCalendarStreak(9, "Thu Nov 5 2026", new Date("2026-11-07T04:00:00.000Z"));
assert.deepEqual(broken, { streak: 1, today: "Sat Nov 7 2026" });

console.log("Calendar streak tests passed: 4 scenarios.");
