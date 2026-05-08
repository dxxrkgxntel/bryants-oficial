const Level = require("../../Models/Level");
const levelRoles = require("../../Levels/levelRoles");
const LevelConfig = require("../../Models/LevelConfig");

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

                    title:
                        "🎉 Subiste de nivel",

                    description:
                        `${message.author} ahora es nivel **${data.level}**`,

                    color: 0x8000ff
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

                            title:
                                "🎭 Nuevo Rol",

                            description:
                                `${message.author} obtuvo el rol **${role.name}**`,

                            color: 0x00ff99
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

        console.log(
            `XP añadido a ${message.author.username}`
        );
    }
};