const { initializeGuildInviteCache } = require("../../Utils/inviteTracker");
const { upsertBotGuild } = require("../../Functions/botGuildRegistry");

module.exports = {
    name: "guildCreate",
    async execute(guild) {
        try {
            await initializeGuildInviteCache(guild);
        } catch (error) {
            console.error("[INVITE TRACKER] No se pudo inicializar la caché del servidor:", error.message);
        }
        await upsertBotGuild(guild);
    }
};
