const { increment } = require("../../Functions/personalStats");
const { recordDailyActivity } = require("../../Functions/personalActivity");
const { trackAchievementProgress } = require("../../Functions/achievementTracker");

module.exports = {
    name: "messageCreate",
    async execute(message) {
        if (!message.guild || !message.author || message.author.bot) return;
        try {
            await increment(message.author.id, message.guild.id, "messages", 1);
            const activity = await recordDailyActivity(message.author.id, message.guild.id, message.createdAt || new Date());
            if (activity) {
                if (activity.daysActiveProgressDelta > 0) await trackAchievementProgress(message.guild, message.author, "days_active", activity.daysActiveProgressDelta);
                if (activity.bestStreakProgressDelta > 0) await trackAchievementProgress(message.guild, message.author, "daily_streak", activity.bestStreakProgressDelta);
            }
            await increment(message.author.id, message.guild.id, "channelMessages", 1, message.channel?.name || message.channel.id);
        } catch (error) {
            console.error("[Personal Stats] No se pudo registrar el mensaje:", error.message);
        }
    }
};
