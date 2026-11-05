const assert = require("node:assert/strict");
const {
    normalizeSeasonKey,
    buildSeasonRanking,
    buildSeasonAwardEvents
} = require("../Functions/trophySeason");

assert.equal(normalizeSeasonKey("  Season-2026_01 "), "season-2026_01");
assert.equal(normalizeSeasonKey(""), null);
assert.equal(normalizeSeasonKey("bad season"), null);
assert.equal(normalizeSeasonKey("x".repeat(81)), null);

const ranking = buildSeasonRanking([
    { userId: "user-b", points: 100, unlocks: 4 },
    { userId: "user-c", points: 100, unlocks: 3 },
    { userId: "user-a", points: 100, unlocks: 4 },
    { userId: "user-d", points: 90, unlocks: 10 },
    { userId: "user-a", points: 1, unlocks: 1 },
    { userId: "", points: 999, unlocks: 999 }
]);
assert.deepEqual(ranking, [
    { userId: "user-a", points: 100, unlocks: 4, rank: 1 },
    { userId: "user-b", points: 100, unlocks: 4, rank: 2 },
    { userId: "user-c", points: 100, unlocks: 3, rank: 3 },
    { userId: "user-d", points: 90, unlocks: 10, rank: 4 }
]);

const events = buildSeasonAwardEvents(ranking, "season-1");
assert.deepEqual(events, [
    { userId: "user-a", rank: 1, metric: "season_podiums", idempotencyKey: "season:season-1:podium" },
    { userId: "user-a", rank: 1, metric: "season_wins", idempotencyKey: "season:season-1:win" },
    { userId: "user-b", rank: 2, metric: "season_podiums", idempotencyKey: "season:season-1:podium" },
    { userId: "user-c", rank: 3, metric: "season_podiums", idempotencyKey: "season:season-1:podium" }
]);
assert.deepEqual(buildSeasonAwardEvents(ranking, "bad season"), []);

console.log("Trophy season tests passed: key validation, deterministic ranking, duplicate filtering and award events.");
