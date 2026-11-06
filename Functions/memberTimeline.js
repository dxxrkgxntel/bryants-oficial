const MemberTimelineEvent = require("../Models/MemberTimelineEvent");

const ALLOWED_TYPES = new Set(["joined", "left", "kick", "ban", "warn", "timeout_added", "timeout_removed"]);
const SNOWFLAKE = /^\d{17,20}$/;

async function recordMemberTimelineEvent({ guildId, userId, type, actorId = null, reason = null, metadata = {} }) {
    if (!SNOWFLAKE.test(String(guildId || "")) || !SNOWFLAKE.test(String(userId || "")) || !ALLOWED_TYPES.has(type)) return null;
    if (actorId != null && !SNOWFLAKE.test(String(actorId))) actorId = null;
    try {
        return await MemberTimelineEvent.create({
            guildId: String(guildId),
            userId: String(userId),
            type,
            actorId,
            reason: reason == null ? null : String(reason).slice(0, 1000),
            metadata: metadata && typeof metadata === "object" ? metadata : {}
        });
    } catch (error) {
        console.warn("[Member Timeline] No se pudo guardar el evento:", error.message);
        return null;
    }
}

module.exports = { recordMemberTimelineEvent };
