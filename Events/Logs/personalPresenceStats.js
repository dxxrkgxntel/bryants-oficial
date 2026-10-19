const { increment, safeMapKey } = require("../../Functions/personalStats");

const presenceSessions = new Map();

function getStatus(presence) {
    const status = presence?.status || "offline";
    return ["online", "idle", "dnd", "offline"].includes(status) ? status : "offline";
}

function getGame(presence) {
    const activity = presence?.activities?.find(item => item.type === 0 && item.name);
    return activity?.name || null;
}

module.exports = {
    name: "presenceUpdate",
    async execute(oldPresence, newPresence) {
        const user = newPresence?.user || oldPresence?.user;
        const guild = newPresence?.guild || oldPresence?.guild;
        if (!user || user.bot || !guild) return;

        const key = `${guild.id}:${user.id}`;
        const now = Date.now();
        const previous = presenceSessions.get(key);
        if (previous) {
            const seconds = Math.floor((now - previous.startedAt) / 1000);
            if (seconds > 0 && seconds < 24 * 60 * 60) {
                try {
                    await increment(user.id, guild.id, "activitySeconds", seconds, previous.status, new Date());
                    if (previous.game) await increment(user.id, guild.id, "gamingSeconds", seconds, safeMapKey(previous.game), new Date());
                } catch (error) {
                    console.error("[Personal Stats] No se pudo registrar actividad:", error.message);
                }
            }
        }

        presenceSessions.set(key, {
            status: getStatus(newPresence),
            game: getGame(newPresence),
            startedAt: now
        });
    }
};
