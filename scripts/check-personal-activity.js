const assert = require("node:assert/strict");
const { activityDayKeys, calculateActivityTransition } = require("../Functions/activityMath");

assert.deepEqual(activityDayKeys(new Date("2026-11-01T23:59:00Z")), { today: "2026-11-01", yesterday: "2026-10-31" });

let state = { daysActive: 0, currentStreak: 0, bestStreak: 0, daysActiveReported: 0, bestStreakReported: 0, lastActiveDay: null };
let next = calculateActivityTransition(state, new Date("2026-11-01T10:00:00Z"));
assert.equal(next.daysActive, 1);
assert.equal(next.currentStreak, 1);
assert.equal(next.bestStreak, 1);
assert.equal(next.daysActiveProgressDelta, 1);
assert.equal(next.bestStreakProgressDelta, 1);

state = { ...next, daysActiveReported: next.daysActive, bestStreakReported: next.bestStreak, lastActiveDay: next.today };
next = calculateActivityTransition(state, new Date("2026-11-01T22:00:00Z"));
assert.equal(next.daysActive, 1);
assert.equal(next.currentStreak, 1);
assert.equal(next.daysActiveProgressDelta, 0);
assert.equal(next.bestStreakProgressDelta, 0);

state = { ...next, daysActiveReported: next.daysActive, bestStreakReported: next.bestStreak, lastActiveDay: next.today };
next = calculateActivityTransition(state, new Date("2026-11-02T08:00:00Z"));
assert.equal(next.daysActive, 2);
assert.equal(next.currentStreak, 2);
assert.equal(next.bestStreak, 2);
assert.equal(next.daysActiveProgressDelta, 1);
assert.equal(next.bestStreakProgressDelta, 1);

state = { ...next, daysActiveReported: next.daysActive, bestStreakReported: next.bestStreak, lastActiveDay: next.today };
next = calculateActivityTransition(state, new Date("2026-11-04T08:00:00Z"));
assert.equal(next.daysActive, 3);
assert.equal(next.currentStreak, 1);
assert.equal(next.bestStreak, 2);
assert.equal(next.daysActiveProgressDelta, 1);
assert.equal(next.bestStreakProgressDelta, 0);

assert.equal(calculateActivityTransition({}, new Date("invalid")), null);
console.log("Personal activity tests passed: 5 scenarios.");
