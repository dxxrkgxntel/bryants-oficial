const Achievement = require("../Models/Achievement");
const UserAchievement = require("../Models/UserAchievement");
const EconomyUser = require("../Models/EconomyUser");

async function trackAchievementProgress(guild, user, metric, amount = 1) {
    if (!guild?.id || !user?.id || !Number.isFinite(amount) || amount <= 0) return [];
    const definitions = await Achievement.find({ guildId: guild.id, enabled: true, metric }).lean();
    if (!definitions.length) return [];

    const unlocked = [];
    for (const achievement of definitions) {
        await UserAchievement.updateOne(
            { guildId: guild.id, userId: user.id, achievementId: achievement.achievementId },
            { $setOnInsert: { guildId: guild.id, userId: user.id, achievementId: achievement.achievementId, progress: 0, unlockedAt: null } },
            { upsert: true }
        );

        const current = await UserAchievement.findOneAndUpdate(
            { guildId: guild.id, userId: user.id, achievementId: achievement.achievementId, unlockedAt: null },
            { $inc: { progress: amount } },
            { new: true }
        );
        if (!current || current.progress < achievement.goal) continue;

        const claimed = await UserAchievement.findOneAndUpdate(
            { _id: current._id, unlockedAt: null, progress: { $gte: achievement.goal } },
            { $set: { unlockedAt: new Date(), progress: achievement.goal } },
            { new: true }
        );
        if (!claimed) continue;

        if (achievement.rewardCoins > 0) {
            await EconomyUser.findOneAndUpdate(
                { guildId: guild.id, userId: user.id },
                { $inc: { wallet: achievement.rewardCoins }, $setOnInsert: { guildId: guild.id, userId: user.id } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        unlocked.push(achievement);
        const channel = achievement.announcementChannelId
            ? guild.channels.cache.get(achievement.announcementChannelId)
            : null;
        if (channel?.isTextBased?.()) {
            const rewardText = achievement.rewardCoins > 0 ? `\n💰 Recompensa: **+${achievement.rewardCoins.toLocaleString()} monedas**.` : "";
            await channel.send({
                content: `🏆 **Logro desbloqueado**\n${achievement.emoji || "🏆"} **${achievement.name}**\n${user} ha conseguido este logro.\n${achievement.description}${rewardText}`
            }).catch(error => console.warn("[Achievements] No se pudo publicar el logro:", error.message));
        }
    }
    return unlocked;
}

module.exports = { trackAchievementProgress };
