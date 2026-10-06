const Level = require("../../Models/Level");
const LevelReward = require("../../Models/LevelReward");
const LevelConfig = require("../../Models/LevelConfig");
const EconomyUser = require("../../Models/EconomyUser");
const { MessageFlags } = require("discord.js");

const LEVEL_UP_BANNER = "https://i.imgur.com/IyrUtlE.png";

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

        const key =
            `${message.guild.id}_${message.author.id}`;

        if (
            cooldown.has(key)
        ) return;

        ////////////////////////////////////////

        cooldown.add(key);

        setTimeout(() => {

            cooldown.delete(key);

        }, 5000);

        ////////////////////////////////////////
        // XP RANDOM
        ////////////////////////////////////////

        const xpRandom =
            Math.floor(Math.random() * 10) + 5;

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

            //////////////////////////////////////////////////
            // RECOMPENSA ECONOMIA
            //////////////////////////////////////////////////

            let economy =
                await EconomyUser.findOne({

                    guildId:
                        message.guild.id,

                    userId:
                        message.author.id
                });

            //////////////////////////////////////////////////

            if (!economy) {

                economy =
                    new EconomyUser({

                        guildId:
                            message.guild.id,

                        userId:
                            message.author.id,

                        wallet: 0,

                        bank: 0
                    });
            }

            //////////////////////////////////////////////////
            // RECOMPENSA
            //////////////////////////////////////////////////

            const reward =
                data.level * 100;

            //////////////////////////////////////////////////

            economy.wallet += reward;

            await economy.save();

            ////////////////////////////////////////
            // LEVEL CONFIG
            ////////////////////////////////////////

            const levelConfig =
                await LevelConfig.findOne({

                    guildId:
                        message.guild.id
                });

            ////////////////////////////////////////
            // LEVEL CHANNEL
            ////////////////////////////////////////

            const levelChannel =
                message.guild.channels.cache.get(
                    levelConfig?.levelChannel
                );

            ////////////////////////////////////////
            // FALLBACK
            ////////////////////////////////////////

            const targetChannel =
                levelChannel ||
                message.channel;

            ////////////////////////////////////////
            // MENSAJE LEVEL UP
            ////////////////////////////////////////

            await targetChannel.send({

                flags: MessageFlags.IsComponentsV2,

                components: [{

                    type: 17,

                    accent_color: 0x8A2BE2,

                    components: [

                        {
                            type: 12,

                            items: [{

                                media: {

                                    url:
                                        LEVEL_UP_BANNER
                                }
                            }]
                        },

                        {
                            type: 10,

                            content:

                                `## 🎉 ¡SUBISTE DE NIVEL!\n` +

                                `### ✨ ¡Felicidades ${message.author}!\n\n` +

                                `Has alcanzado el **nivel ${data.level}** gracias a tu actividad y participación dentro del servidor.\n\n` +

                                `💰 **Recompensa recibida:** ${reward.toLocaleString()} coins\n` +

                                `⭐ **Nivel actual:** ${data.level}\n\n` +

                                `🔥 Sigue participando para desbloquear más recompensas y nuevos roles.`
                        }
                    ]
                }]
            });

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

                    ////////////////////////////////////////
                    // MENSAJE ROL
                    ////////////////////////////////////////

                    await targetChannel.send({

                        flags: MessageFlags.IsComponentsV2,

                        components: [{

                            type: 17,

                            accent_color: 0x57F287,

                            components: [

                                {
                                    type: 12,

                                    items: [{

                                        media: {

                                            url:
                                                LEVEL_UP_BANNER
                                        }
                                    }]
                                },

                                {
                                    type: 10,

                                    content:

                                        `## 🎭 NUEVO ROL DESBLOQUEADO\n` +

                                        `### ✨ ¡Felicidades ${message.author}!\n\n` +

                                        `Has desbloqueado el rol **${role.name}** al alcanzar el **nivel ${data.level}**.\n\n` +

                                        `🏆 Continúa participando para seguir avanzando en el sistema de niveles.`
                                }
                            ]
                        }]
                    });
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