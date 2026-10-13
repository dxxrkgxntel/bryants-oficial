const { scheduleServerStatsUpdate } = require("../../Functions/serverStats");

module.exports = {
    name: "guildMemberRemove",
    async execute(member) {
        scheduleServerStatsUpdate(member.guild);
    }
};
