const { voiceSessions } = require("../Logs/personalVoiceStats");
const { presenceSessions } = require("../Logs/personalPresenceStats");

module.exports = {
    name: "clientReady",
    once: true,
    execute(client) {
        const now = Date.now();
        for (const guild of client.guilds.cache.values()) {
            for (const state of guild.voiceStates.cache.values()) {
                const member = state.member;
                if (state.channelId && member && !member.user.bot) {
                    voiceSessions.set(`${guild.id}:${member.id}`, {
                        channelId: state.channelId,
                        startedAt: now
                    });
                }
            }
            for (const member of guild.members.cache.values()) {
                if (!member.user.bot && member.presence) {
                    const status = ["online", "idle", "dnd", "offline"].includes(member.presence.status)
                        ? member.presence.status
                        : "offline";
                    const game = member.presence.activities?.find(activity => activity.type === 0 && activity.name)?.name || null;
                    presenceSessions.set(`${guild.id}:${member.id}`, { status, game, startedAt: now });
                }
            }
        }
    }
};
