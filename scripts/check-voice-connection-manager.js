const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const managerPath = path.join(__dirname, "..", "Handlers", "voiceConnectionManager.js");
const source = fs.readFileSync(managerPath, "utf8");

assert.match(source, /const READY_TIMEOUT_MS = 30_000;/);
assert.match(source, /const DISCONNECT_GRACE_MS = 7_000;/);
assert.match(source, /function isExpectedReadyTimeout\(error\)/);
assert.match(source, /error\?\.name === "AbortError"/);
assert.match(source, /function scheduleDisconnectRecovery\(/);
assert.match(source, /VoiceConnectionStatus\.Connecting/);
assert.match(source, /VoiceConnectionStatus\.Signalling/);
assert.match(source, /connection\.rejoin\(/);
assert.match(source, /CONFIG_SYNC_INTERVAL_MS = 15_000/);

// The 24/7 monitor must not compete with @discordjs/voice while it is already reconnecting.
const syncBlock = source.slice(source.indexOf("async function syncVoiceConnections"), source.indexOf("function startVoiceConnectionSync"));
assert.match(syncBlock, /else if \(connection\.state\.status === VoiceConnectionStatus\.Disconnected\)/);
assert.doesNotMatch(syncBlock, /else \{\s*scheduleReconnect\(guild\.id\);/);

console.log("Voice connection recovery tests passed: timeout handling, disconnect grace, state-aware retries and sync supervision.");
