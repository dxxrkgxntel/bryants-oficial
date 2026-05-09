const Level = require("../../Models/Level");
const LevelConfig = require("../../Models/LevelConfig");

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
                            // LEVEL UP
                            //////////////////////////////////////////////////

                            const xpNeeded =
                                (data.level + 1) * 100;

                            //////////////////////////////////////////////////

                            if (data.xp >= xpNeeded) {

                                //////////////////////////////////////////////////
                                // SUBIR NIVEL
                                //////////////////////////////////////////////////

                                data.level += 1;

                                data.xp = 0;

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
                                // MENSAJE
                                //////////////////////////////////////////////////

                                if (levelChannel) {

                                    await levelChannel.send({

                                        embeds: [{

                                            title:
                                                "🎙️ Subida de nivel en voz",

                                            description:

                                                `${member} subió al nivel **${data.level}** por actividad en canales de voz.`,

                                            color:
                                                0x8A2BE2,

                                            footer: {

                                                text:
                                                    "Sistema de niveles por voz"
                                            },

                                            timestamp:
                                                new Date()
                                        }]
                                    }).catch(() => {});
                                }
                            }

                            //////////////////////////////////////////////////

                            await data.save();
                        }
                    }
                }
            );

        }, 60000);
    }
};