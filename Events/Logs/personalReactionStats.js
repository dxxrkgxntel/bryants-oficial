const { increment } = require("../../Functions/personalStats");

module.exports = {
    name: "messageReactionAdd",
    async execute(reaction, user) {
        if (!user || user.bot) return;
        try {
            if (reaction.partial) await reaction.fetch();
            const message = reaction.message;
            const guild = message?.guild;
            if (!guild) return;
            await increment(user.id, guild.id, "reactionsGiven", 1);
            const author = message.author || (message.partial ? (await message.fetch()).author : null);
            if (author && !author.bot && author.id !== user.id) {
                await increment(author.id, guild.id, "reactionsReceived", 1);
            }
        } catch (error) {
            console.error("[Personal Stats] No se pudo registrar la reacción:", error.message);
        }
    }
};
