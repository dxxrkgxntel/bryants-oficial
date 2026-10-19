const { initializeGuildInviteCache } = require("../../Utils/inviteTracker");

module.exports = {
    name: "guildCreate",
    async execute(guild) {
        await initializeGuildInviteCache(guild);
    }
};
