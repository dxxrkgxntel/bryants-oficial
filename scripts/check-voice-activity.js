const assert = require("node:assert/strict");
const { minutesProgress } = require("../Functions/voiceActivityMath");

assert.equal(minutesProgress(59, 0), 0);
assert.equal(minutesProgress(60, 0), 1);
assert.equal(minutesProgress(119, 0), 1);
assert.equal(minutesProgress(120, 1), 1);
assert.equal(minutesProgress(180, 3), 0);
assert.equal(minutesProgress(241, 3), 1);
assert.equal(minutesProgress(-20, 0), 0);

console.log("Voice duration achievement tests passed: 7 scenarios.");
