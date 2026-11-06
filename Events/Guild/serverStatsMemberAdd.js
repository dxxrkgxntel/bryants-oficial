const { scheduleServerStatsUpdate } = require("../../Functions/serverStats");
const { recordMemberTimelineEvent } = require("../../Functions/memberTimeline");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        scheduleServerStatsUpdate(member.guild);
        await recordMemberTimelineEvent({ guildId: member.guild.id, userId: member.id, type: "joined" });
    }
};
