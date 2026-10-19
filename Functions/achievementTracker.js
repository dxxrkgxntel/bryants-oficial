const Achievement = require("../Models/Achievement");
const UserAchievement = require("../Models/UserAchievement");
const EconomyUser = require("../Models/EconomyUser");

const seededGuilds = new Map();
const DEFAULT_ACHIEVEMENTS = [
    { achievementId: "first_steps", name: "Primeros pasos", description: "Envía 1 mensaje en el servidor.", emoji: "👋", category: "activity", metric: "messages", goal: 1, rewardCoins: 100 },
    { achievementId: "chatty_100", name: "Conversador", description: "Envía 100 mensajes en el servidor.", emoji: "💬", category: "activity", metric: "messages", goal: 100, rewardCoins: 250 },
    { achievementId: "level_5", name: "En ascenso", description: "Alcanza 5 niveles.", emoji: "⭐", category: "progression", metric: "levels", goal: 5, rewardCoins: 500 },
    { achievementId: "daily_7", name: "Constancia", description: "Reclama 7 recompensas diarias.", emoji: "📆", category: "economy", metric: "dailyClaims", goal: 7, rewardCoins: 500 },
    { achievementId: "work_10", name: "A trabajar", description: "Completa 10 jornadas de trabajo.", emoji: "💼", category: "economy", metric: "workClaims", goal: 10, rewardCoins: 500 },
    { achievementId: "shop_first", name: "Primer comprador", description: "Compra tu primer artículo o rol en la tienda.", emoji: "🛍️", category: "shop", metric: "itemsPurchased", goal: 1, rewardCoins: 250 },
    { achievementId: "coins_10000", name: "Pequeña fortuna", description: "Gana 10.000 monedas mediante recompensas compatibles.", emoji: "💰", category: "economy", metric: "coinsEarned", goal: 10000, rewardCoins: 1000 }
];

async function ensureDefaultAchievements(guildId) {
    if (!guildId) return;
    if (seededGuilds.has(guildId)) return seededGuilds.get(guildId);
    const pending = Promise.all(DEFAULT_ACHIEVEMENTS.map(item => Achievement.updateOne(
        { guildId, achievementId: item.achievementId },
        { $setOnInsert: { ...item, guildId, enabled: true } },
        { upsert: true }
    ))).catch(error => {
        seededGuilds.delete(guildId);
        throw error;
    });
    seededGuilds.set(guildId, pending);
    return pending;
}

async function trackAchievementProgress(guild, user, metric, amount = 1) {
    if (!guild?.id || !user?.id || !Number.isFinite(amount) || amount <= 0) return [];
    await ensureDefaultAchievements(guild.id);
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
            ? (guild.channels.cache.get(achievement.announcementChannelId) || await guild.channels.fetch(achievement.announcementChannelId).catch(() => null))
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

module.exports = { trackAchievementProgress, ensureDefaultAchievements };
