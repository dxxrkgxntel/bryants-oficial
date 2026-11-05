const { increment } = require("../../Functions/personalStats");
const { trackAchievementProgress } = require("../../Functions/achievementTracker");

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
            await trackAchievementProgress(guild, user, "reactions_added", 1)
                .catch(error => console.warn("[Achievements] No se pudo registrar reactions_added:", error.message));
            const author = message.author || (message.partial ? (await message.fetch()).author : null);
            if (author && !author.bot && author.id !== user.id) {
                await increment(author.id, guild.id, "reactionsReceived", 1);
                await trackAchievementProgress(guild, author, "reactions_received", 1)
                    .catch(error => console.warn("[Achievements] No se pudo registrar reactions_received:", error.message));
            }
        } catch (error) {
            console.error("[Personal Stats] No se pudo registrar la reacción:", error.message);
        }
    }
};
