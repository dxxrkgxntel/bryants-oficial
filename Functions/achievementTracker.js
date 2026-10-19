const Achievement = require("../Models/Achievement");
const UserAchievement = require("../Models/UserAchievement");
const EconomyUser = require("../Models/EconomyUser");
const TrophySettings = require("../Models/TrophySettings");
const { EmbedBuilder } = require("discord.js");

const seededGuilds = new Map();
const DEFAULT_ACHIEVEMENTS = [
    { achievementId: "first_steps", name: "Primeros pasos", description: "Envía 1 mensaje en el servidor.", emoji: "👋", category: "activity", metric: "messages", goal: 1, rewardCoins: 100, points: 5 },
    { achievementId: "chatty_100", name: "Conversador", description: "Envía 100 mensajes en el servidor.", emoji: "💬", category: "activity", metric: "messages", goal: 100, rewardCoins: 250, points: 10 },
    { achievementId: "level_5", name: "En ascenso", description: "Alcanza 5 niveles.", emoji: "⭐", category: "progression", metric: "levels", goal: 5, rewardCoins: 500, points: 15 },
    { achievementId: "daily_7", name: "Constancia", description: "Reclama 7 recompensas diarias.", emoji: "📆", category: "economy", metric: "dailyClaims", goal: 7, rewardCoins: 500, points: 10 },
    { achievementId: "work_10", name: "A trabajar", description: "Completa 10 jornadas de trabajo.", emoji: "💼", category: "economy", metric: "workClaims", goal: 10, rewardCoins: 500, points: 10 },
    { achievementId: "shop_first", name: "Primer comprador", description: "Compra tu primer artículo o rol en la tienda.", emoji: "🛍️", category: "shop", metric: "itemsPurchased", goal: 1, rewardCoins: 250, points: 10 },
    { achievementId: "coins_10000", name: "Pequeña fortuna", description: "Gana 10.000 monedas mediante recompensas compatibles.", emoji: "💰", category: "economy", metric: "coinsEarned", goal: 10000, rewardCoins: 1000, points: 20 }
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
    const settings = await TrophySettings.findOne({ guildId: guild.id }).lean();
    if (settings?.enabled === false || (user.bot && settings?.includeBots !== true)) return [];
    const minAge = Number(settings?.minimumAccountAgeDays || 0);
    if (minAge > 0 && user.createdAt && Date.now() - user.createdAt.getTime() < minAge * 86400000) return [];
    await ensureDefaultAchievements(guild.id);
    const definitions = await Achievement.find({ guildId: guild.id, enabled: true, metric }).lean();
    if (!definitions.length) return [];
    const multiplier = Math.max(0, Math.min(100, Number(settings?.pointsMultiplier ?? 1)));
    const unlocked = [];
    for (const achievement of definitions) {
        try {
            await UserAchievement.updateOne(
                { guildId: guild.id, userId: user.id, achievementId: achievement.achievementId },
                { $setOnInsert: { guildId: guild.id, userId: user.id, achievementId: achievement.achievementId, progress: 0, unlockedAt: null, unlockedLevels: [], pointsEarned: 0 } },
                { upsert: true }
            );
        } catch (error) { if (error.code !== 11000) throw error; }

        const parsedGoals = String(achievement.levelGoals || "").split(",").map(x => Number(x.trim())).filter(x => Number.isSafeInteger(x) && x > 0);
        const goals = parsedGoals.length ? [...new Set(parsedGoals)].sort((x, y) => x - y) : [Number(achievement.goal)];
        if (!goals.length || !goals.every(Number.isFinite)) continue;
        const pointsList = String(achievement.levelPoints || "").split(",").map(x => Number(x.trim()));
        const rarityList = String(achievement.levelRarities || "").split(",").map(x => x.trim().toLowerCase());
        const current = await UserAchievement.findOneAndUpdate(
            { guildId: guild.id, userId: user.id, achievementId: achievement.achievementId, unlockedAt: null },
            { $inc: { progress: amount } }, { new: true }
        );
        if (!current) continue;
        const progress = Math.min(current.progress, goals[goals.length - 1]);
        for (let i = 0; i < goals.length; i += 1) {
            if (progress < goals[i]) continue;
            const points = Math.max(0, Math.round((Number.isFinite(pointsList[i]) && pointsList[i] >= 0 ? pointsList[i] : Number(achievement.points ?? 10)) * multiplier));
            const update = await UserAchievement.updateOne(
                { _id: current._id, unlockedLevels: { $ne: i + 1 } },
                { $addToSet: { unlockedLevels: i + 1 }, $inc: { pointsEarned: points } }
            );
            if (!update.modifiedCount) continue;
            const rarity = ["common", "uncommon", "rare", "epic", "legendary", "mythic"].includes(rarityList[i]) ? rarityList[i] : (achievement.rarity || "common");
            const tier = { level: i + 1, goal: goals[i], points, rarity };
            unlocked.push({ ...achievement, level: tier.level, awardedPoints: points, rarity });
            if (achievement.rewardCoins > 0) {
                await EconomyUser.findOneAndUpdate(
                    { guildId: guild.id, userId: user.id },
                    { $inc: { wallet: achievement.rewardCoins }, $setOnInsert: { guildId: guild.id, userId: user.id } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
            const mode = settings?.announcementMode || "embed";
            if (mode !== "silent") {
                const channelId = achievement.announcementChannelId || settings?.announcementChannelId;
                const channel = mode === "dm" ? user : channelId ? (guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null)) : null;
                if (channel && (mode === "dm" || channel.isTextBased?.())) {
                    const rarityLabel = rarity.toUpperCase();
                    const message = String(settings?.announcementTemplate || "{user} desbloqueó {achievement} (+{points} puntos)")
                        .replace(/\{user\}/gi, user.toString()).replace(/\{achievement\}/gi, achievement.name)
                        .replace(/\{points\}/gi, String(points)).replace(/\{rarity\}/gi, rarityLabel);
                    try {
                        if (mode === "text" || mode === "dm") await channel.send({ content: mode === "dm" ? "🏆 " + message : message });
                        else {
                            const embed = new EmbedBuilder().setColor(/^#[0-9a-fA-F]{6}$/.test(settings?.cardColor || "") ? parseInt(settings.cardColor.slice(1), 16) : 0x0000ff)
                                .setTitle((settings?.cardTitle || "TROFEO DESBLOQUEADO") + " · " + (achievement.emoji || "🏆"))
                                .setDescription("**" + achievement.name + "**\n" + achievement.description)
                                .addFields({ name: "Rareza", value: rarityLabel, inline: true }, { name: "Puntos", value: "+" + points, inline: true }, { name: "Nivel", value: String(i + 1), inline: true });
                            await channel.send({ content: message, embeds: [embed] });
                        }
                    } catch (error) { console.warn("[Achievements] No se pudo anunciar el trofeo:", error.message); }
                }
            }
        }
        const after = await UserAchievement.findById(current._id).lean();
        if (after && goals.every((_goal, index) => (after.unlockedLevels || []).includes(index + 1))) {
            await UserAchievement.updateOne({ _id: current._id, unlockedAt: null }, { $set: { unlockedAt: new Date(), progress: goals[goals.length - 1] } });
        } else if (after && after.progress > goals[goals.length - 1]) {
            await UserAchievement.updateOne({ _id: current._id }, { $set: { progress: goals[goals.length - 1] } });
        }
    }
    return unlocked;
}

module.exports = { trackAchievementProgress, ensureDefaultAchievements };
