const assert = require("node:assert/strict");
const { getZonedDateParts, getNextZonedDateParts } = require("../Functions/birthdayDates");

assert.deepEqual(getZonedDateParts(new Date("2026-11-06T03:59:00.000Z")), { year: 2026, month: 11, day: 5 });
assert.deepEqual(getZonedDateParts(new Date("2026-11-06T04:00:00.000Z")), { year: 2026, month: 11, day: 6 });
assert.deepEqual(getNextZonedDateParts(new Date("2026-11-06T04:00:00.000Z")), { year: 2026, month: 11, day: 7 });
assert.equal(getZonedDateParts(new Date("invalid")), null);

console.log("Birthday timezone tests passed: 4 scenarios.");
