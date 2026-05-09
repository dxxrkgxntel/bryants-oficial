const Level = require("../../Models/Level");
const levelRoles = require("../../Levels/levelRoles");
const LevelConfig = require("../../Models/LevelConfig");
const EconomyUser = require("../../Models/EconomyUser");

const cooldown = new Set();

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
        // COOLDOWN XP
        ////////////////////////////////////////

        if (
            cooldown.has(message.author.id)
        ) return;

        cooldown.add(message.author.id);

        setTimeout(() => {

            cooldown.delete(message.author.id);

        }, 5000);

        ////////////////////////////////////////
        // XP RANDOM
        ////////////////////////////////////////

        const xpRandom =
            Math.floor(Math.random() * 10) + 5;

        ////////////////////////////////////////
        // BUSCAR DATA
        ////////////////////////////////////////

        let data = await Level.findOne({

            userId: message.author.id,

            guildId: message.guild.id
        });

        ////////////////////////////////////////
        // CREAR DATA
        ////////////////////////////////////////

        if (!data) {

            data = new Level({

                userId: message.author.id,

                guildId: message.guild.id,

                xp: xpRandom,

                level: 0
            });

        } else {

            data.xp += xpRandom;
        }

        ////////////////////////////////////////
        // XP NECESARIA
        ////////////////////////////////////////

        const xpNeeded =
            (data.level + 1) * 100;

        ////////////////////////////////////////
        // SUBIR NIVEL
        ////////////////////////////////////////

        if (data.xp >= xpNeeded) {

            data.level += 1;

            data.xp = 0;

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
            // CALCULO RECOMPENSA
            //////////////////////////////////////////////////

            const reward =

                data.level * 100;

            //////////////////////////////////////////////////

            economy.wallet += reward;

            await economy.save();

            ////////////////////////////////////////
            // BUSCAR CONFIG
            ////////////////////////////////////////

            const levelConfig =
                await LevelConfig.findOne({

                    guildId: message.guild.id
                });

            ////////////////////////////////////////
            // BUSCAR CANAL
            ////////////////////////////////////////

            const levelChannel =
                message.guild.channels.cache.get(
                    levelConfig?.levelChannel
                );

            ////////////////////////////////////////
            // FALLBACK
            ////////////////////////////////////////

            const targetChannel =
                levelChannel || message.channel;

            ////////////////////////////////////////
            // MENSAJE LEVEL UP
            ////////////////////////////////////////

            await targetChannel.send({

                embeds: [{
                    title:"🎉 Subiste de nivel",
                    description:`✨ ¡Felicidades ${message.author}!\n\n` +`Has alcanzado el nivel **${data.level}** gracias a tu actividad y participación dentro del servidor.\n\n` +`💰 Recompensa recibida: **${reward} coins**\n\n` +`🔥 Sigue enviando mensajes, participando y manteniéndote activo para desbloquear más recompensas y subir aún más rápido.`,
                    color: 0x8000ff,
                    thumbnail: {url:message.author.displayAvatarURL({dynamic: true,size: 1024})},
                    image: {url:"https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"}
                }]
            });

            ////////////////////////////////////////
            // ROLES POR NIVEL
            ////////////////////////////////////////

            const roleId =
                levelRoles[data.level];

            ////////////////////////////////////////
            // SI EXISTE ROL
            ////////////////////////////////////////

            if (roleId) {

                const role =
                    message.guild.roles.cache.get(
                        roleId
                    );

                ////////////////////////////////////////
                // DAR ROL
                ////////////////////////////////////////

                if (role) {

                    await message.member.roles
                        .add(role)
                        .catch(() => {});

                    ////////////////////////////////////////
                    // MENSAJE ROL
                    ////////////////////////////////////////

                    await targetChannel.send({

                        embeds: [{
                            title:"🎭 Nuevo Rol Desbloqueado",
                            description:`✨ ¡Felicidades ${message.author}!\n\n` +`Has desbloqueado el rol **${role.name}** gracias a tu actividad y progreso dentro del servidor.\n\n` +`🏆 Continúa participando, subiendo de nivel y manteniéndote activo para obtener aún más beneficios y recompensas exclusivas.`,
                            color: 0x00ff99,
                            thumbnail: {url: message.author.displayAvatarURL({dynamic: true, size: 1024})},
                            image: {url:"https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"}
                        }]
                    });
                }
            }
        }

        ////////////////////////////////////////
        // GUARDAR DATA
        ////////////////////////////////////////

        await data.save();

        ////////////////////////////////////////
        // LOG
        ////////////////////////////////////////

        console.log(`XP añadido a ${message.author.username}`.green);
    }
};