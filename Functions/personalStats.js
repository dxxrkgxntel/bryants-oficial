const PersonalStatsDaily = require("../Models/PersonalStatsDaily");

function dayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function safeMapKey(value) {
    return String(value || "desconocido")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) || "desconocido";
}

async function increment(userId, guildId, field, amount = 1, mapKey = null, date = new Date()) {
    if (!/^\d{17,20}$/.test(String(userId || "")) || !/^\d{17,20}$/.test(String(guildId || ""))) return;
    const allowedFields = new Set(["messages", "voiceSeconds", "reactionsGiven", "reactionsReceived"]);
    const updatePath = mapKey !== null
        ? `${field}.${safeMapKey(mapKey)}`
        : field;
    if (!allowedFields.has(field) && !["activitySeconds", "gamingSeconds", "channelMessages"].includes(field)) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    await PersonalStatsDaily.updateOne(
        { userId: String(userId), guildId: String(guildId), day: dayKey(date) },
        { $inc: { [updatePath]: value }, $setOnInsert: { userId: String(userId), guildId: String(guildId), day: dayKey(date) } },
        { upsert: true }
    );
}

module.exports = { increment, dayKey, safeMapKey };
