const { handleMemberJoin } = require("../../Utils/inviteTracker");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        await handleMemberJoin(member);
    }
};
