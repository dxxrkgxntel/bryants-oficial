module.exports = {
    name: "threadCreate",
    async execute(thread, client) {
        if (!thread?.guild || !thread.ownerId || !client?.users) return;
        try {
            const owner = await client.users.fetch(thread.ownerId);
            if (!owner || owner.bot) return;
            const { trackAchievementProgress } = require("../../Functions/achievementTracker");
            await trackAchievementProgress(thread.guild, owner, "threads_created", 1);
        } catch (error) {
            console.error("[Achievements] No se pudo registrar threads_created:", error.message);
        }
    }
};
