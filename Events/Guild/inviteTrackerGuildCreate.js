const { initializeGuildInviteCache } = require("../../Utils/inviteTracker");
const { upsertBotGuild } = require("../../Functions/botGuildRegistry");

module.exports = {
    name: "guildCreate",
    async execute(guild) {
        await initializeGuildInviteCache(guild);
        await upsertBotGuild(guild);
    }
};
