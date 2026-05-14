const Level =
    require("../../Models/Level");

const LevelConfig =
    require("../../Models/LevelConfig");

const LevelReward =
    require("../../Models/LevelReward");

const EconomyUser =
    require("../../Models/EconomyUser");

//////////////////////////////////////////////////
// CONFIG
//////////////////////////////////////////////////

const VOICE_XP = 15;

const VOICE_COOLDOWN =
    5 * 60 * 1000;

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
                            members.size < 2
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

                            }, VOICE_COOLDOWN);

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

                                        xp: VOICE_XP,

                                        level: 0
                                    });

                            } else {

                                data.xp +=
                                    VOICE_XP;
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

                                //////////////////////////////////////////////////
                                // REWARD
                                //////////////////////////////////////////////////

                                const reward =
                                    data.level * 100;

                                //////////////////////////////////////////////////

                                economy.wallet += reward;

                                await economy.save();

                                //////////////////////////////////////////////////
                                // CONFIG
                                //////////////////////////////////////////////////

                                const levelConfig =

                                    await LevelConfig.findOne({

                                        guildId:
                                            guild.id
                                    });

                                //////////////////////////////////////////////////
                                // CHANNEL
                                //////////////////////////////////////////////////

                                const levelChannel =

                                    guild.channels.cache.get(

                                        levelConfig?.levelChannel
                                    );

                                //////////////////////////////////////////////////
                                // LEVEL UP MESSAGE
                                //////////////////////////////////////////////////

                                if (levelChannel) {

                                    await levelChannel.send({

                                        embeds: [{

                                            title:
                                                "🎉 Subiste de nivel",

                                            description:

                                                `✨ ¡Felicidades ${member}!\n\n` +

                                                `Has alcanzado el nivel **${data.level}** gracias a tu actividad y participación dentro del servidor.\n\n` +

                                                `💰 Recompensa recibida: **${reward} coins**\n\n` +

                                                `🔥 Sigue participando y manteniéndote activo para desbloquear más recompensas.`,

                                            color: 0x8A2BE2,

                                            thumbnail: {

                                                url:
                                                    member.user.displayAvatarURL({

                                                        dynamic: true,

                                                        size: 1024
                                                    })
                                            },

                                            image: {

                                                url:
                                                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                                            }
                                        }]
                                    }).catch(() => {});
                                }

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

                                        //////////////////////////////////////////////////
                                        // ROLE MESSAGE
                                        //////////////////////////////////////////////////

                                        if (levelChannel) {

                                            await levelChannel.send({

                                                embeds: [{

                                                    title:
                                                        "🎭 Nuevo Rol Desbloqueado",

                                                    description:

                                                        `✨ ¡Felicidades ${member}!\n\n` +

                                                        `Has desbloqueado el rol **${role.name}** gracias a tu progreso dentro del servidor.`,

                                                    color: 0x00ff99,

                                                    thumbnail: {

                                                        url:
                                                            member.user.displayAvatarURL({

                                                                dynamic: true,

                                                                size: 1024
                                                            })
                                                    },

                                                    image: {

                                                        url:
                                                            "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                                                    }
                                                }]
                                            }).catch(() => {});
                                        }
                                    }
                                }
                            }

                            //////////////////////////////////////////////////
                            // SAVE
                            //////////////////////////////////////////////////

                            await data.save();
                        }
                    }
                }
            );

        }, 60000);
    }
};