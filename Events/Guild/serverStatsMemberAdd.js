const { scheduleServerStatsUpdate } = require("../../Functions/serverStats");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        scheduleServerStatsUpdate(member.guild);
    }
};
