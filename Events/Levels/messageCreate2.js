const Level = require("../../Models/Level");
const LevelReward = require("../../Models/LevelReward");
const LevelConfig = require("../../Models/LevelConfig");
const EconomyUser = require("../../Models/EconomyUser");
const { getLevelSettings } = require("../../Functions/levelSettings");
const { sendLevelNotification } = require("../../Functions/levelNotification");
const { trackAchievementProgress } = require("../../Functions/achievementTracker");
const { recordEconomyEarning } = require("../../Functions/economyEarningMetrics");
const { recordExperience } = require("../../Functions/experienceMetrics");
const { extractMessageAchievementMetrics } = require("../../Functions/achievementMessageMetrics");
const { createMemberAchievementMetricTracker } = require("../../Functions/memberAchievementMetrics");
const { trackBoostAchievementMetric } = require("../../Functions/boostAchievementMetrics");
const trackMemberAchievementMetrics = createMemberAchievementMetricTracker({ trackProgress: trackAchievementProgress });

function xpNeeded(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

//////////////////////////////////////////////////
// COOLDOWN
//////////////////////////////////////////////////

const cooldown =
    new Set();

//////////////////////////////////////////////////

module.exports = {

    name: "messageCreate",

    async execute(message) {

        ////////////////////////////////////////
        // IGNORAR BOTS Y DMS
        ////////////////////////////////////////

        if (
            message.author.bot ||
            !message.guild
        ) return;

        await trackMemberAchievementMetrics(message.guild, message.author, message.member)
            .catch(error => console.warn("[Achievements] No se pudieron registrar edad/roles:", error.message));
        if (message.member?.premiumSince) {
            await trackBoostAchievementMetric(message.guild, message.member)
                .catch(error => console.warn("[Achievements] No se pudo actualizar boost_months:", error.message));
        }

        await trackAchievementProgress(message.guild, message.author, "messages", 1)
            .catch(error => console.warn("[Achievements] No se pudo registrar el mensaje:", error.message));
        await trackAchievementProgress(message.guild, message.author, "messages_sent", 1)
            .catch(error => console.warn("[Achievements] No se pudo registrar messages_sent:", error.message));
        if (message.mentions.users.has(message.client.user.id)) {
            await trackAchievementProgress(message.guild, message.author, "bot_mentions", 1)
                .catch(error => console.warn("[Achievements] No se pudo registrar bot_mentions:", error.message));
        }
        const customEmojiCount = (message.content.match(/<a?:[a-zA-Z0-9_]+:\d{17,20}>/g) || []).length;
        if (customEmojiCount) {
            await trackAchievementProgress(message.guild, message.author, "custom_emojis_used", customEmojiCount)
                .catch(error => console.warn("[Achievements] No se pudo registrar custom_emojis_used:", error.message));
        }
        if (message.embeds?.length) {
            await trackAchievementProgress(message.guild, message.author, "embeds_posted", message.embeds.length)
                .catch(error => console.warn("[Achievements] No se pudo registrar embeds_posted:", error.message));
        }

        const messageMetrics = extractMessageAchievementMetrics(message);
        for (const [metric, amount] of Object.entries(messageMetrics)) {
            await trackAchievementProgress(message.guild, message.author, metric, amount)
                .catch(error => console.warn(`[Achievements] No se pudo registrar ${metric}:`, error.message));
        }

        ////////////////////////////////////////
        // COOLDOWN POR SERVER + USER
        ////////////////////////////////////////

        const levelSettings = await getLevelSettings(message.guild.id);
        if (!levelSettings.enabled) return;
        const key =
            `${message.guild.id}_${message.author.id}`;

        if (
            cooldown.has(key)
        ) return;

        ////////////////////////////////////////

        cooldown.add(key);

        setTimeout(() => {

            cooldown.delete(key);

        }, levelSettings.messageXpCooldownMs);

        ////////////////////////////////////////
        // XP RANDOM
        ////////////////////////////////////////

        const xpRandom =
            Math.floor(Math.random() * (levelSettings.messageXpMax - levelSettings.messageXpMin + 1)) + levelSettings.messageXpMin;

        ////////////////////////////////////////
        // BUSCAR DATA
        ////////////////////////////////////////

        let data =
            await Level.findOne({

                userId:
                    message.author.id,

                guildId:
                    message.guild.id
            });

        ////////////////////////////////////////
        // CREAR DATA
        ////////////////////////////////////////

        if (!data) {

            data =
                new Level({

                    userId:
                        message.author.id,

                    guildId:
                        message.guild.id,

                    xp: xpRandom,

                    level: 0
                });

        } else {

            data.xp += xpRandom;
        }

        ////////////////////////////////////////
        // XP NECESARIA
        ////////////////////////////////////////

        let neededXp =
            xpNeeded(data.level);

        ////////////////////////////////////////
        // MULTI LEVEL UP
        ////////////////////////////////////////

        while (data.xp >= neededXp) {

            ////////////////////////////////////////
            // SUBIR NIVEL
            ////////////////////////////////////////

            data.level += 1;
            await trackAchievementProgress(message.guild, message.author, "levels", 1)
                .catch(error => console.warn("[Achievements] No se pudo registrar el nivel:", error.message));

            ////////////////////////////////////////
            // XP SOBRANTE
            ////////////////////////////////////////

            data.xp -= neededXp;

            ////////////////////////////////////////
            // NUEVA XP NECESARIA
            ////////////////////////////////////////

            neededXp =
            xpNeeded(data.level);

            const levelConfig = await LevelConfig.findOne({ guildId: message.guild.id });
            let economy = await EconomyUser.findOne({ guildId: message.guild.id, userId: message.author.id });
            if (!economy) {
                economy = new EconomyUser({ guildId: message.guild.id, userId: message.author.id, wallet: 0, bank: 0 });
            }
            const reward = data.level * (Number.isFinite(levelConfig?.levelCoinReward) ? levelConfig.levelCoinReward : 0);
            economy.wallet += reward;
            await economy.save();
            if (reward > 0) await recordEconomyEarning({
                guild: message.guild, user: message.author, amount: reward,
                category: "level_reward", operationId: "level:" + message.id + ":" + data.level
            }).catch(error => console.warn("[Economy] No se pudo registrar recompensa de nivel:", error.message));
            if (reward > 0) await trackAchievementProgress(message.guild, message.author, "coinsEarned", reward)
                .catch(error => console.warn("[Achievements] No se pudo registrar la recompensa de nivel:", error.message));

            const levelChannel = message.guild.channels.cache.get(levelConfig?.levelChannel);
            await sendLevelNotification(levelChannel, levelConfig, "message", {
                usuario: `${message.author}`,
                username: message.author.username,
                userTag: message.author.tag || message.author.username,
                servidor: message.guild.name,
                serverId: message.guild.id,
                nivel: data.level,
                xp: data.xp,
                recompensa: reward
            }).catch(error => console.error("[Levels] No se pudo enviar el aviso de nivel:", error.message));

            ////////////////////////////////////////
            // ROLES POR NIVEL
            ////////////////////////////////////////

            const levelReward =
                await LevelReward.findOne({

                    guildId:
                        message.guild.id,

                    level:
                        data.level
                });

            //////////////////////////////////////////////////

            const roleId =
                levelReward?.roleId;

            ////////////////////////////////////////
            // SI EXISTE ROL
            ////////////////////////////////////////

            if (roleId) {

                const role =
                    message.guild.roles.cache.get(
                        roleId
                    );

                ////////////////////////////////////////
                // DAR ROL SI NO LO TIENE
                ////////////////////////////////////////

                if (

                    role &&

                    !message.member.roles.cache.has(
                        role.id
                    )

                ) {

                    //////////////////////////////////////////////////
                    // OBTENER TODOS LOS ROLES
                    //////////////////////////////////////////////////

                    const allRewards =

                        await LevelReward.find({

                            guildId:
                                message.guild.id
                        });

                    //////////////////////////////////////////////////
                    // REMOVER ROLES ANTERIORES
                    //////////////////////////////////////////////////

                    for (

                        const rewardRole
                        of allRewards

                    ) {

                        //////////////////////////////////////////////////

                        if (
                            rewardRole.roleId === role.id
                        ) continue;

                        //////////////////////////////////////////////////

                        if (

                            message.member.roles.cache.has(
                                rewardRole.roleId
                            )

                        ) {

                            await message.member.roles

                                .remove(
                                    rewardRole.roleId
                                )

                                .catch(() => {});
                        }
                    }

                    //////////////////////////////////////////////////
                    // DAR NUEVO ROL
                    //////////////////////////////////////////////////

                    await message.member.roles
                        .add(role)
                        .catch(() => {});

                    const levelChannel = message.guild.channels.cache.get(levelConfig?.levelChannel);
                    await sendLevelNotification(levelChannel, levelConfig, "role", {
                        usuario: `${message.author}`,
                        username: message.author.username,
                        userTag: message.author.tag || message.author.username,
                        servidor: message.guild.name,
                        serverId: message.guild.id,
                        nivel: data.level,
                        rol: role.name
                    }).catch(error => console.error("[Levels] No se pudo enviar el aviso de rol:", error.message));
                }
            }
        }

        ////////////////////////////////////////
        // GUARDAR DATA
        ////////////////////////////////////////

        await data.save();
        await recordExperience({
            guild: message.guild, user: message.author, amount: xpRandom,
            category: "message_xp", operationId: "message:" + message.id
        }).catch(error => console.warn("[Achievements] No se pudo registrar XP de mensaje:", error.message));
        if (data.level > Number(data.achievementLevelReported || 0)) {
            try {
                await trackAchievementProgress(message.guild, message.author, "level", data.level, { absolute: true });
                data.achievementLevelReported = data.level;
                await data.save();
            } catch (error) {
                console.warn("[Achievements] No se pudo registrar level:", error.message);
            }
        }

        console.log(`XP añadido a ${message.author.username}`.green);
    }
};
