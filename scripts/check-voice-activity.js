const assert = require("node:assert/strict");
const { minutesProgress, voiceMinutesSnapshot } = require("../Functions/voiceActivityMath");

assert.equal(minutesProgress(59, 0), 0);
assert.equal(minutesProgress(60, 0), 1);
assert.equal(minutesProgress(119, 0), 1);
assert.equal(minutesProgress(120, 1), 1);
assert.equal(minutesProgress(180, 3), 0);
assert.equal(minutesProgress(241, 3), 1);
assert.equal(minutesProgress(-20, 0), 0);

assert.deepEqual(voiceMinutesSnapshot(59, 0), { totalMinutes: 0, shouldReport: false });
assert.deepEqual(voiceMinutesSnapshot(60, 0), { totalMinutes: 1, shouldReport: true });
assert.deepEqual(voiceMinutesSnapshot(241, 3), { totalMinutes: 4, shouldReport: true });
assert.deepEqual(voiceMinutesSnapshot(241, 4), { totalMinutes: 4, shouldReport: false });
assert.deepEqual(voiceMinutesSnapshot(-20, 0), { totalMinutes: 0, shouldReport: false });

console.log("Voice duration achievement tests passed: 12 scenarios.");
