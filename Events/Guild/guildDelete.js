const { markBotGuildLeft } = require("../../Functions/botGuildRegistry");

module.exports = {
    name: "guildDelete",
    async execute(guild) {
        await markBotGuildLeft(guild);
    }
};
