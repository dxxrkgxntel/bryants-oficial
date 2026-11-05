const assert = require("node:assert/strict");
const { getZonedDateParts, getNextZonedDateParts, getZonedDateString, getAdjacentZonedDateString } = require("../Functions/birthdayDates");

assert.deepEqual(getZonedDateParts(new Date("2026-11-06T03:59:00.000Z")), { year: 2026, month: 11, day: 5 });
assert.deepEqual(getZonedDateParts(new Date("2026-11-06T04:00:00.000Z")), { year: 2026, month: 11, day: 6 });
assert.deepEqual(getNextZonedDateParts(new Date("2026-11-06T04:00:00.000Z")), { year: 2026, month: 11, day: 7 });
assert.equal(getZonedDateParts(new Date("invalid")), null);
assert.equal(getZonedDateString(new Date("2026-11-06T04:00:00.000Z")), "Fri Nov 6 2026");
assert.equal(getAdjacentZonedDateString(new Date("2026-11-06T04:00:00.000Z"), -1), "Thu Nov 5 2026");

console.log("Birthday timezone tests passed: 6 scenarios.");
