const Level = require("../../Models/Level");
const LevelReward = require("../../Models/LevelReward");
const LevelConfig = require("../../Models/LevelConfig");
const EconomyUser = require("../../Models/EconomyUser");
const { getLevelSettings } = require("../../Functions/levelSettings");
const { sendLevelNotification } = require("../../Functions/levelNotification");

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

        console.log(`XP añadido a ${message.author.username}`.green);
    }
};
