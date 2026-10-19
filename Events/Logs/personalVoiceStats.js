const { addDuration } = require("../../Functions/personalStats");

const voiceSessions = new Map();

module.exports = {
    name: "voiceStateUpdate",
    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        const guild = newState.guild || oldState.guild;
        if (!member || member.user?.bot || !guild) return;

        const key = `${guild.id}:${member.id}`;
        const oldChannelId = oldState.channelId;
        const newChannelId = newState.channelId;
        if (oldChannelId === newChannelId) return;

        const session = voiceSessions.get(key);
        if (session && oldChannelId) {
            const seconds = Math.floor((Date.now() - session.startedAt) / 1000);
            if (seconds > 0) {
                try { await addDuration(member.id, guild.id, "voiceSeconds", seconds, new Date(session.startedAt), new Date()); }
                catch (error) { console.error("[Personal Stats] No se pudo registrar voz:", error.message); }
            }
        }

        if (newChannelId) voiceSessions.set(key, { channelId: newChannelId, startedAt: Date.now() });
        else voiceSessions.delete(key);
    }
};
