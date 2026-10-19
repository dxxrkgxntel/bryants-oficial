const { increment } = require("../../Functions/personalStats");

module.exports = {
    name: "messageCreate",
    async execute(message) {
        if (!message.guild || !message.author || message.author.bot) return;
        try {
            await increment(message.author.id, message.guild.id, "messages", 1);
            await increment(message.author.id, message.guild.id, "channelMessages", 1, message.channel?.name || message.channel.id);
        } catch (error) {
            console.error("[Personal Stats] No se pudo registrar el mensaje:", error.message);
        }
    }
};
