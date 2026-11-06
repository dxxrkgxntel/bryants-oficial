const Achievement = require("../Models/Achievement");
const UserAchievement = require("../Models/UserAchievement");
const EconomyUser = require("../Models/EconomyUser");
const EconomyEarningTransaction = require("../Models/EconomyEarningTransaction");
const Level = require("../Models/Level");
const TrophySettings = require("../Models/TrophySettings");
const TrophyScore = require("../Models/TrophyScore");
const { EmbedBuilder } = require("discord.js");
const { sendTrophyCard, sendTrophyComponents } = require("./trophyCard");
const { achievementComparatorReached, achievementProgressUpdate } = require("./achievementRules");
const { buildTotalAchievementPointsPipeline, normalizeTotalAchievementPoints } = require("./achievementPoints");
const { recordFirstAchievementUnlock } = require("./firstUnlockAchievementMetric");
const { createAchievementCompletionRecorder } = require("./achievementCompletionMetrics");

const recordAchievementCompletions = createAchievementCompletionRecorder({
    trackProgress: (...args) => trackAchievementProgress(...args),
    recordFirstUnlock: recordFirstAchievementUnlock
});

const seededGuilds = new Map();
const totalPointsSyncCache = new Set();

async function hasAchievementPrerequisites(guildId, userId, prerequisiteIds = []) {
    const required = [...new Set((prerequisiteIds || []).filter(id => typeof id === "string" && id.trim()))];
    if (!required.length) return true;
    const completed = await UserAchievement.countDocuments({
        guildId,
        userId,
        achievementId: { $in: required },
        unlockedAt: { $ne: null }
    });
    return completed === required.length;
}
const DEFAULT_ACHIEVEMENTS = [
    { achievementId: "first_steps", name: "Primeros pasos", description: "Envía 1 mensaje en el servidor.", emoji: "👋", category: "activity", metric: "messages", goal: 1, rewardCoins: 100, points: 5 },
    { achievementId: "chatty_100", name: "Conversador", description: "Envía 100 mensajes en el servidor.", emoji: "💬", category: "activity", metric: "messages", goal: 100, rewardCoins: 250, points: 10 },
    { achievementId: "level_5", name: "En ascenso", description: "Alcanza 5 niveles.", emoji: "⭐", category: "progression", metric: "levels", goal: 5, rewardCoins: 500, points: 15 },
    { achievementId: "daily_7", name: "Constancia", description: "Reclama 7 recompensas diarias.", emoji: "📆", category: "economy", metric: "dailyClaims", goal: 7, rewardCoins: 500, points: 10 },
    { achievementId: "work_10", name: "A trabajar", description: "Completa 10 jornadas de trabajo.", emoji: "💼", category: "economy", metric: "workClaims", goal: 10, rewardCoins: 500, points: 10 },
    { achievementId: "shop_first", name: "Primer comprador", description: "Compra tu primer artículo o rol en la tienda.", emoji: "🛍️", category: "shop", metric: "itemsPurchased", goal: 1, rewardCoins: 250, points: 10 },
    { achievementId: "coins_10000", name: "Pequeña fortuna", description: "Gana 10.000 monedas mediante recompensas compatibles.", emoji: "💰", category: "economy", metric: "coinsEarned", goal: 10000, rewardCoins: 1000, points: 20 }
];

const NOTOQ_BACKUP = require("../data/backups/notoq-achievements.json");
const NOTOQ_ACHIEVEMENTS = NOTOQ_BACKUP.achievements.map(item => ({
    achievementId: item.id,
    name: item.name,
    description: item.description || item.raw_description || item.name,
    emoji: item.icon || "🏆",
    category: item.category,
    metric: item.metric,
    comparator: item.comparator || "gte",
    goal: item.threshold,
    points: item.points,
    rarity: item.rarity,
    rewardCoins: item.reward_coins || 0,
    rewardXP: item.reward_xp || 0,
    rewardRoleIds: item.reward_role_ids || [],
    rewardRemoveRoleIds: item.reward_remove_role_ids || [],
    rewardTitle: item.reward_title || null,
    secret: Boolean(item.secret),
    repeatable: Boolean(item.repeatable),
    announce: item.announce !== false,
    prerequisiteIds: item.prerequisite_ids || [],
    icon: item.icon || "🏆",
    iconType: item.icon_type || "emoji",
    iconUrl: item.icon_url || null,
    symbol: item.symbol || null,
    badgeFrame: item.badge_frame || null,
    color: item.color || null,
    source: "notoq",
    builtinKey: item.builtin_key || item.id,
    enabled: item.enabled !== false
}));

async function ensureDefaultAchievements(guildId) {
    if (!guildId) return;
    if (seededGuilds.has(guildId)) return seededGuilds.get(guildId);
    const pending = (async () => {
        await Promise.all(DEFAULT_ACHIEVEMENTS.map(item => Achievement.updateOne(
            { guildId, achievementId: item.achievementId },
            { $setOnInsert: { ...item, guildId, enabled: true } },
            { upsert: true }
        )));
        const settings = await TrophySettings.findOne({ guildId }).select("notoqCatalogSeeded").lean();
        if (!settings?.notoqCatalogSeeded) {
            await Promise.all(NOTOQ_ACHIEVEMENTS.map(item => Achievement.updateOne(
                { guildId, achievementId: item.achievementId },
                { $setOnInsert: { ...item, guildId } },
                { upsert: true }
            )));
            await TrophySettings.updateOne(
                { guildId },
                { $set: { notoqCatalogSeeded: true }, $setOnInsert: { guildId } },
                { upsert: true }
            );
        }
    })().catch(error => {
        seededGuilds.delete(guildId);
        throw error;
    });
    seededGuilds.set(guildId, pending);
    return pending;
}

async function getTotalAchievementPoints(guildId, userId) {
    const [result] = await UserAchievement.aggregate(buildTotalAchievementPointsPipeline(guildId, userId));
    return normalizeTotalAchievementPoints(result);
}

async function syncTotalAchievementPoints(guild, user) {
    if (!guild?.id || !user?.id) return;
    try {
        for (let pass = 0; pass < 100; pass += 1) {
            const total = await getTotalAchievementPoints(guild.id, user.id);
            if (total <= 0) return;
            await trackAchievementProgress(guild, user, "total_points", total, {
                absolute: true,
                skipTotalPointsSync: true
            });
            const updatedTotal = await getTotalAchievementPoints(guild.id, user.id);
            if (updatedTotal <= total) return;
        }
        console.warn("[Achievements] La sincronización de total_points alcanzó el límite de iteraciones.");
    } catch (error) {
        console.warn("[Achievements] No se pudo sincronizar total_points:", error.message);
    }
}

async function trackAchievementProgress(guild, user, metric, amount = 1, options = {}) {
    if (!guild?.id || !user?.id || !Number.isFinite(amount) || amount <= 0) return [];
    const settings = await TrophySettings.findOne({ guildId: guild.id }).lean();
    if (settings?.enabled === false || (user.bot && settings?.includeBots !== true)) return [];
    const minAge = Number(settings?.minimumAccountAgeDays || 0);
    if (minAge > 0 && user.createdAt && Date.now() - user.createdAt.getTime() < minAge * 86400000) return [];
    await ensureDefaultAchievements(guild.id);
    const syncKey = `${guild.id}:${user.id}`;
    if (metric !== "total_points" && options?.skipTotalPointsSync !== true && !totalPointsSyncCache.has(syncKey)) {
        await syncTotalAchievementPoints(guild, user);
        totalPointsSyncCache.add(syncKey);
        if (totalPointsSyncCache.size > 20000) {
            totalPointsSyncCache.delete(totalPointsSyncCache.values().next().value);
        }
    }
    const definitions = await Achievement.find({ guildId: guild.id, enabled: true, metric }).lean();
    if (!definitions.length) return [];
    const multiplier = Math.max(0, Math.min(100, Number(settings?.pointsMultiplier ?? 1)));
    const unlocked = [];
    const newlyCompleted = [];
    let pointsAwarded = false;
    for (const achievement of definitions) {
        if (!await hasAchievementPrerequisites(guild.id, user.id, achievement.prerequisiteIds)) continue;
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
        const progressFilter = {
            guildId: guild.id,
            userId: user.id,
            achievementId: achievement.achievementId,
            unlockedAt: null
        };
        const progressUpdate = achievementProgressUpdate(amount, options?.absolute === true);
        if (options?.idempotencyKey) {
            progressFilter.processedEventKeys = { $ne: String(options.idempotencyKey) };
            progressUpdate.$addToSet = {
                ...(progressUpdate.$addToSet || {}),
                processedEventKeys: String(options.idempotencyKey)
            };
        }
        let current = await UserAchievement.findOneAndUpdate(
            progressFilter,
            progressUpdate,
            { new: true }
        );
        if (!current && options?.idempotencyKey) {
            current = await UserAchievement.findOne({
                guildId: guild.id,
                userId: user.id,
                achievementId: achievement.achievementId,
                unlockedAt: null,
                processedEventKeys: String(options.idempotencyKey)
            });
            if (current) pointsAwarded = true;
        }
        if (!current) continue;
        const comparator = achievement.comparator || "gte";
        // Los logros escalonados usan umbrales acumulativos; los comparadores alternativos
        // se evalúan contra un único umbral para respetar la regla importada.
        const progress = current.progress;
        for (let i = 0; i < goals.length; i += 1) {
            const reached = comparator === "gte"
                ? achievementComparatorReached(progress, goals[i], "gte")
                : goals.length === 1 && achievementComparatorReached(progress, goals[i], comparator);
            if (!reached) continue;
            const points = Math.max(0, Math.round((Number.isFinite(pointsList[i]) && pointsList[i] >= 0 ? pointsList[i] : Number(achievement.points ?? 10)) * multiplier));
            const update = await UserAchievement.updateOne(
                { _id: current._id, unlockedLevels: { $ne: i + 1 } },
                { $addToSet: { unlockedLevels: i + 1 }, $inc: { pointsEarned: points } }
            );
            const levelAlreadyUnlocked = (current.unlockedLevels || []).includes(i + 1);
            if (settings?.seasonEnabled === true && typeof settings.seasonKey === "string" && settings.seasonKey.trim() && (update.modifiedCount || levelAlreadyUnlocked)) {
                const seasonKey = settings.seasonKey.trim().toLowerCase();
                const scoreEventKey = `season:${seasonKey}:achievement:${achievement.achievementId}:level:${i + 1}`;
                try {
                    const scoreFilter = { guildId: guild.id, userId: user.id, seasonKey };
                    const existingScore = await TrophyScore.findOne(scoreFilter).select("processedEventKeys").lean();
                    if (!existingScore?.processedEventKeys?.includes(scoreEventKey)) {
                        const scoreEventFilter = { ...scoreFilter, processedEventKeys: { $ne: scoreEventKey } };
                        const scoreUpdate = {
                            $inc: { points, unlocks: 1 },
                            $addToSet: { processedEventKeys: scoreEventKey },
                            $setOnInsert: { guildId: guild.id, userId: user.id, seasonKey }
                        };
                        try {
                            await TrophyScore.updateOne(scoreEventFilter, scoreUpdate, { upsert: true });
                        } catch (error) {
                            if (error.code !== 11000) throw error;
                            await TrophyScore.updateOne(scoreEventFilter, scoreUpdate);
                        }
                    }
                } catch (error) {
                    console.warn("[Trophy Season] No se pudo actualizar el ranking:", error.message);
                }
            }
            if (!update.modifiedCount) continue;
            if (points > 0) pointsAwarded = true;
            const rarity = ["common", "uncommon", "rare", "epic", "legendary", "mythic"].includes(rarityList[i]) ? rarityList[i] : (achievement.rarity || "common");
            const tier = { level: i + 1, goal: goals[i], points, rarity };
            unlocked.push({ ...achievement, level: tier.level, awardedPoints: points, rarity });
            if (achievement.rewardXP > 0) {
                await Level.findOneAndUpdate(
                    { guildId: guild.id, userId: user.id },
                    { $inc: { xp: achievement.rewardXP }, $setOnInsert: { guildId: guild.id, userId: user.id } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                if (metric !== "xp") {
                    await trackAchievementProgress(guild, user, "xp", achievement.rewardXP, { skipTotalPointsSync: true });
                }
            }
            if (achievement.rewardRoleIds?.length || achievement.rewardRemoveRoleIds?.length) {
                const member = await guild.members.fetch(user.id).catch(() => null);
                if (member) {
                    if (achievement.rewardRoleIds?.length) await member.roles.add(achievement.rewardRoleIds).catch(error => console.warn("[Achievements] No se pudieron asignar roles:", error.message));
                    if (achievement.rewardRemoveRoleIds?.length) await member.roles.remove(achievement.rewardRemoveRoleIds).catch(error => console.warn("[Achievements] No se pudieron retirar roles:", error.message));
                }
            }
            if (achievement.rewardCoins > 0) {
                const rewardedEconomy = await EconomyUser.findOneAndUpdate(
                    { guildId: guild.id, userId: user.id },
                    { $inc: { wallet: achievement.rewardCoins }, $setOnInsert: { guildId: guild.id, userId: user.id } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                await EconomyEarningTransaction.updateOne(
                    { guildId: guild.id, userId: user.id, operationId: "achievement-reward:" + achievement.achievementId + ":" + (i + 1) },
                    { $setOnInsert: {
                        guildId: guild.id,
                        userId: user.id,
                        operationId: "achievement-reward:" + achievement.achievementId + ":" + (i + 1),
                        category: "achievement_reward",
                        amount: achievement.rewardCoins
                    } },
                    { upsert: true }
                );
                const { trackEconomyAchievementSnapshot } = require("./economyAchievementMetrics");
                await trackEconomyAchievementSnapshot(guild, user, rewardedEconomy);
            }
            const mode = achievement.announce === false ? "silent" : (settings?.announcementMode || "embed");
            if (mode !== "silent") {
                const channelId = achievement.announcementChannelId || settings?.announcementChannelId;
                const channel = mode === "dm" ? user : channelId ? (guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null)) : null;
                if (channel && (mode === "dm" || channel.isTextBased?.())) {
                    const rarityLabel = rarity.toUpperCase();
                    const message = String(settings?.announcementTemplate || "{user} desbloqueó {achievement} (+{points} puntos)")
                        .replace(/\{user\}/gi, user.toString()).replace(/\{achievement\}/gi, achievement.name)
                        .replace(/\{points\}/gi, String(points)).replace(/\{rarity\}/gi, rarityLabel);
                    try {
                        if (mode === "text" || mode === "dm") {
                            await channel.send({ content: mode === "dm" ? "🏆 " + message : message, allowedMentions: { parse: [], users: [user.id] } });
                        } else if (mode === "card") {
                            await sendTrophyCard(channel, { user, achievement, points, rarity: rarityLabel, level: i + 1, settings, message });
                        } else if (mode === "components") {
                            await sendTrophyComponents(channel, { user, achievement, points, rarity: rarityLabel, level: i + 1, settings, message });
                        } else if (mode === "embed") {
                            const embed = new EmbedBuilder().setColor(/^#[0-9a-fA-F]{6}$/.test(settings?.cardColor || "") ? parseInt(settings.cardColor.slice(1), 16) : 0x0000ff)
                                .setTitle((settings?.cardTitle || "TROFEO DESBLOQUEADO") + " · " + (achievement.emoji || "🏆"))
                                .setDescription("**" + achievement.name + "**\n" + achievement.description)
                                .addFields({ name: "Rareza", value: rarityLabel, inline: true }, { name: "Puntos", value: "+" + points, inline: true }, { name: "Nivel", value: String(i + 1), inline: true });
                            await channel.send({ content: message, embeds: [embed], allowedMentions: { parse: [], users: [user.id] } });
                        }
                    } catch (error) { console.warn("[Achievements] No se pudo anunciar el trofeo:", error.message); }
                }
            }
        }
        const after = await UserAchievement.findById(current._id).lean();
        if (after && goals.every((_goal, index) => (after.unlockedLevels || []).includes(index + 1))) {
            const completion = await UserAchievement.updateOne(
                { _id: current._id, unlockedAt: null },
                { $set: { unlockedAt: new Date(), progress: goals[goals.length - 1] } }
            );
            if (completion.modifiedCount) newlyCompleted.push(achievement.achievementId);
        } else if (after && comparator === "gte" && after.progress > goals[goals.length - 1]) {
            await UserAchievement.updateOne({ _id: current._id }, { $set: { progress: goals[goals.length - 1] } });
        }
    }
    await recordAchievementCompletions({ guild, user, achievementIds: newlyCompleted });
    if ((pointsAwarded || unlocked.some(achievement => Number(achievement.rewardXP) > 0)) && metric !== "total_points" && options?.skipTotalPointsSync !== true) {
        await syncTotalAchievementPoints(guild, user);
    }
    return unlocked;
}

module.exports = {
    trackAchievementProgress,
    ensureDefaultAchievements,
    achievementComparatorReached,
    achievementProgressUpdate,
    hasAchievementPrerequisites,
    getTotalAchievementPoints,
    syncTotalAchievementPoints
};
