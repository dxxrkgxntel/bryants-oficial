const Level =
    require("../../Models/Level");

const LevelConfig =
    require("../../Models/LevelConfig");

const LevelReward =
    require("../../Models/LevelReward");

const EconomyUser =
    require("../../Models/EconomyUser");

const questHandler =
    require("../../Functions/questHandler");
const { getLevelSettings } = require("../../Functions/levelSettings");
const { sendLevelNotification } = require("../../Functions/levelNotification");

//////////////////////////////////////////////////
// CACHE
//////////////////////////////////////////////////

const voiceCooldown =
    new Set();

//////////////////////////////////////////////////

module.exports = {

    name: "clientReady",

    once: true,

    async execute(client) {

        console.log(
            "[VOICE XP] Cargado correctamente.".green
        );

        //////////////////////////////////////////////////
        // LOOP
        //////////////////////////////////////////////////

        setInterval(async () => {

            //////////////////////////////////////////////////
            // GUILDS
            //////////////////////////////////////////////////

            client.guilds.cache.forEach(

                async (guild) => {

                    const levelSettings = await getLevelSettings(guild.id);
                    if (!levelSettings.enabled) return;

                    //////////////////////////////////////////////////
                    // VOICE CHANNELS
                    //////////////////////////////////////////////////

                    const voiceChannels =

                        guild.channels.cache.filter(

                            c =>
                                c.isVoiceBased()
                        );

                    //////////////////////////////////////////////////

                    for (

                        const channel
                        of voiceChannels.values()

                    ) {

                        //////////////////////////////////////////////////
                        // MEMBERS
                        //////////////////////////////////////////////////

                        const members =

                            channel.members.filter(

                                member =>

                                    !member.user.bot &&

                                    !member.voice.selfMute &&

                                    !member.voice.selfDeaf
                            );

                        //////////////////////////////////////////////////
                        // ANTI FARM
                        //////////////////////////////////////////////////

                        if (
                            members.size < levelSettings.voiceMinMembers
                        ) continue;

                        //////////////////////////////////////////////////
                        // USERS
                        //////////////////////////////////////////////////

                        for (

                            const member
                            of members.values()

                        ) {

                            //////////////////////////////////////////////////
                            // COOLDOWN
                            //////////////////////////////////////////////////

                            const key =
                                `${guild.id}_${member.id}`;

                            //////////////////////////////////////////////////

                            if (
                                voiceCooldown.has(key)
                            ) continue;

                            //////////////////////////////////////////////////

                            voiceCooldown.add(key);

                            setTimeout(() => {

                                voiceCooldown.delete(key);

                            }, levelSettings.voiceXpCooldownMs);

                            //////////////////////////////////////////////////
                            // DATA
                            //////////////////////////////////////////////////

                            let data =

                                await Level.findOne({

                                    userId:
                                        member.id,

                                    guildId:
                                        guild.id
                                });

                            //////////////////////////////////////////////////
                            // CREATE
                            //////////////////////////////////////////////////

                            if (!data) {

                                data =
                                    new Level({

                                        userId:
                                            member.id,

                                        guildId:
                                            guild.id,

                                        xp: levelSettings.voiceXpAmount,

                                        level: 0
                                    });

                            } else {

                                data.xp +=
                                    levelSettings.voiceXpAmount;
                            }

                            //////////////////////////////////////////////////
                            // XP NEEDED
                            //////////////////////////////////////////////////

                            let xpNeeded =

                                (data.level + 1) * 100;

                            //////////////////////////////////////////////////
                            // MULTI LEVEL UP
                            //////////////////////////////////////////////////

                            while (

                                data.xp >= xpNeeded

                            ) {

                                //////////////////////////////////////////////////
                                // LEVEL UP
                                //////////////////////////////////////////////////

                                data.level += 1;

                                //////////////////////////////////////////////////
                                // REMOVE XP
                                //////////////////////////////////////////////////

                                data.xp -= xpNeeded;

                                //////////////////////////////////////////////////
                                // NEW XP NEEDED
                                //////////////////////////////////////////////////

                                xpNeeded =

                                    (data.level + 1) * 100;

                                //////////////////////////////////////////////////
                                // ECONOMY
                                //////////////////////////////////////////////////

                                let economy =

                                    await EconomyUser.findOne({

                                        guildId:
                                            guild.id,

                                        userId:
                                            member.id
                                    });

                                //////////////////////////////////////////////////

                                if (!economy) {

                                    economy =
                                        new EconomyUser({

                                            guildId:
                                                guild.id,

                                            userId:
                                                member.id,

                                            wallet: 0,

                                            bank: 0
                                        });
                                }

                                const levelConfig = await LevelConfig.findOne({ guildId: guild.id });
                                const reward = data.level * (Number.isFinite(levelConfig?.levelCoinReward) ? levelConfig.levelCoinReward : 0);
                                economy.wallet += reward;
                                await economy.save();

                                const levelChannel = guild.channels.cache.get(levelConfig?.levelChannel);
                                await sendLevelNotification(levelChannel, levelConfig, "voice", {
                                    usuario: `${member}`,
                                    username: member.user.username,
                                    userTag: member.user.tag || member.user.username,
                                    servidor: guild.name,
                                    serverId: guild.id,
                                    nivel: data.level,
                                    xp: data.xp,
                                    recompensa: reward
                                }).catch(error => console.error("[Levels] No se pudo enviar el aviso de nivel:", error.message));

                                //////////////////////////////////////////////////
                                // LEVEL REWARD
                                //////////////////////////////////////////////////

                                const rewardData =

                                    await LevelReward.findOne({

                                        guildId:
                                            guild.id,

                                        level:
                                            data.level
                                    });

                                //////////////////////////////////////////////////

                                const roleId =
                                    rewardData?.roleId;

                                //////////////////////////////////////////////////
                                // ROLE
                                //////////////////////////////////////////////////

                                if (roleId) {

                                    const role =

                                        guild.roles.cache.get(
                                            roleId
                                        );

                                    //////////////////////////////////////////////////

                                    if (

                                        role &&

                                        !member.roles.cache.has(
                                            role.id
                                        )

                                    ) {

                                        //////////////////////////////////////////////////
                                        // OBTENER TODOS LOS ROLES
                                        //////////////////////////////////////////////////

                                        const allRewards =

                                            await LevelReward.find({

                                                guildId:
                                                    guild.id
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

                                                member.roles.cache.has(
                                                    rewardRole.roleId
                                                )

                                            ) {

                                                await member.roles

                                                    .remove(
                                                        rewardRole.roleId
                                                    )

                                                    .catch(() => {});
                                            }
                                        }

                                        //////////////////////////////////////////////////
                                        // DAR NUEVO ROL
                                        //////////////////////////////////////////////////

                                        await member.roles
                                            .add(role)
                                            .catch(() => {});

                                        await sendLevelNotification(levelChannel, levelConfig, "role", {
                                            usuario: `${member}`,
                                            username: member.user.username,
                                            userTag: member.user.tag || member.user.username,
                                            servidor: guild.name,
                                            serverId: guild.id,
                                            nivel: data.level,
                                            rol: role.name
                                        }).catch(error => console.error("[Levels] No se pudo enviar el aviso de rol:", error.message));
                                    }
                                }
                            }

                            //////////////////////////////////////////////////
                            // SAVE
                            //////////////////////////////////////////////////

                            await data.save();

                            // QUESTS DE VOZ: cada ciclo valido equivale a 5 minutos.
                            await questHandler(
                                member.id,
                                guild.id,
                                "voice",
                                5
                            );
                        }
                    }
                }
            );

        }, 60000);
    }
};
