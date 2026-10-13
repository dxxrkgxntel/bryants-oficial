const LevelConfig = require("../Models/LevelConfig");

const SETTINGS_TTL = 30_000;
const settingsCache = new Map();

const defaults = {
    messageXpMin: 5,
    messageXpMax: 14,
    messageXpCooldownMs: 5000,
    voiceXpAmount: 15,
    voiceXpCooldownMs: 300000,
    voiceMinMembers: 2
};

async function getLevelSettings(guildId) {
    const cached = settingsCache.get(guildId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const config = await LevelConfig.findOne({ guildId }).lean();
    const value = { ...defaults };
    for (const key of Object.keys(defaults)) {
        if (Number.isFinite(config?.[key])) value[key] = config[key];
    }
    value.messageXpMin = Math.max(0, value.messageXpMin);
    value.messageXpMax = Math.max(value.messageXpMin, value.messageXpMax);
    value.messageXpCooldownMs = Math.max(0, value.messageXpCooldownMs);
    value.voiceXpAmount = Math.max(1, value.voiceXpAmount);
    value.voiceXpCooldownMs = Math.max(1000, value.voiceXpCooldownMs);
    value.voiceMinMembers = Math.max(1, value.voiceMinMembers);

    settingsCache.set(guildId, { value, expiresAt: Date.now() + SETTINGS_TTL });
    return value;
}

module.exports = { getLevelSettings };
