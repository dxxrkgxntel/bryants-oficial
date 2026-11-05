const assert = require("node:assert/strict");
const { extractVoiceAchievementMetrics } = require("../Functions/voiceAchievementMetrics");

assert.deepEqual(extractVoiceAchievementMetrics({}, { channelId: "voice-1" }), { voice_joins: 1 });
assert.deepEqual(extractVoiceAchievementMetrics({ channelId: "voice-1" }, {}), {});
assert.deepEqual(extractVoiceAchievementMetrics({ channelId: "voice-1" }, { channelId: "voice-2" }), {});
assert.deepEqual(extractVoiceAchievementMetrics({ channelId: "voice-1" }, { channelId: "voice-1" }), {});
assert.deepEqual(extractVoiceAchievementMetrics({}, {}), {});

console.log("Voice achievement metric tests passed: 5 scenarios.");
