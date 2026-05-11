const Level = require("../../Models/Level");
const LevelConfig = require("../../Models/LevelConfig");
const levelRoles = require("../../Levels/levelRoles");

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
            // RECORRER SERVERS
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
                        // FILTRAR USERS VALIDOS
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

                            if (
                                voiceCooldown.has(key)
                            ) continue;

                            //////////////////////////////////////////////////

                            voiceCooldown.add(key);

                            setTimeout(() => {

                                voiceCooldown.delete(
                                    key
                                );

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
                            // XP NECESARIA
                            //////////////////////////////////////////////////

                            const xpNeeded =
                                (data.level + 1) * 100;

                            //////////////////////////////////////////////////
                            // LEVEL UP
                            //////////////////////////////////////////////////

                            if (data.xp >= xpNeeded) {

                                //////////////////////////////////////////////////
                                // SUBIR NIVEL
                                //////////////////////////////////////////////////

                                data.level += 1;

                                //////////////////////////////////////////////////
                                // XP SOBRANTE
                                //////////////////////////////////////////////////

                                data.xp -= xpNeeded;

                                //////////////////////////////////////////////////
                                // CONFIG
                                //////////////////////////////////////////////////

                                const levelConfig =
                                    await LevelConfig.findOne({

                                        guildId:
                                            guild.id
                                    });

                                //////////////////////////////////////////////////
                                // CANAL
                                //////////////////////////////////////////////////

                                const levelChannel =
                                    guild.channels.cache.get(

                                        levelConfig?.levelChannel
                                    );

                                //////////////////////////////////////////////////
                                // MENSAJE LEVEL UP
                                //////////////////////////////////////////////////

                                if (levelChannel) {

                                    await levelChannel.send({

                                        embeds: [{

                                            title:
                                                "🎉 Subida de nivel en voz",

                                            description:

                                                `🎊 ¡Felicidades ${member}!\n\n` +

                                                `Has alcanzado el nivel **${data.level}** gracias a tu actividad en los canales de voz.\n\n` +

                                                `🔥 Sigue participando, hablando y manteniéndote activo para continuar subiendo de nivel y desbloquear nuevas recompensas dentro del servidor.`,

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
                                                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"
                                            }
                                        }]
                                    }).catch(() => {});
                                }

                                //////////////////////////////////////////////////
                                // ROLES POR NIVEL
                                //////////////////////////////////////////////////

                                const roleId =
                                    levelRoles[data.level];

                                //////////////////////////////////////////////////
                                // SI EXISTE ROL
                                //////////////////////////////////////////////////

                                if (roleId) {

                                    const role =
                                        guild.roles.cache.get(
                                            roleId
                                        );

                                    //////////////////////////////////////////////////
                                    // DAR ROL
                                    //////////////////////////////////////////////////

                                    if (role) {

                                        await member.roles
                                            .add(role)
                                            .catch(() => {});

                                        //////////////////////////////////////////////////
                                        // MENSAJE ROL
                                        //////////////////////////////////////////////////

                                        if (levelChannel) {

                                            await levelChannel.send({

                                                embeds: [{

                                                    title:
                                                        "🎭 Nuevo Rol Desbloqueado",

                                                    description:

                                                        `✨ ¡Felicidades ${member}!\n\n` +

                                                        `Has desbloqueado el rol **${role.name}** gracias a tu actividad en canales de voz.\n\n` +

                                                        `🎤 Sigue participando en voz para continuar obteniendo recompensas exclusivas.`,

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
                                                            "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"
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