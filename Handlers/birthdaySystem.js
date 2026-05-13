const cron =
    require("node-cron");

const Birthday =
    require("../Models/Birthday");

const BirthdayConfig =
    require("../Models/BirthdayConfig");

const EconomyUser =
    require("../Models/EconomyUser");

const {
    EmbedBuilder
} = require("discord.js");

module.exports = (client) => {

    //////////////////////////////////////////////////
    // BIRTHDAY SYSTEM
    //////////////////////////////////////////////////

    cron.schedule(

        "0 0 * * *",

        async () => {

            try {

                //////////////////////////////////////////////////
                // DATE
                //////////////////////////////////////////////////

                const now =
                    new Date();

                //////////////////////////////////////////////////

                const day =
                    now.getDate();

                //////////////////////////////////////////////////

                const month =
                    now.getMonth() + 1;

                //////////////////////////////////////////////////
                // TOMORROW
                //////////////////////////////////////////////////

                const tomorrow =
                    new Date();

                //////////////////////////////////////////////////

                tomorrow.setDate(
                    tomorrow.getDate() + 1
                );

                //////////////////////////////////////////////////

                const tomorrowDay =
                    tomorrow.getDate();

                //////////////////////////////////////////////////

                const tomorrowMonth =
                    tomorrow.getMonth() + 1;

                //////////////////////////////////////////////////
                // TODAY BIRTHDAYS
                //////////////////////////////////////////////////

                const birthdays =
                    await Birthday.find({

                        day,
                        month
                    });

                //////////////////////////////////////////////////
                // TOMORROW BIRTHDAYS
                //////////////////////////////////////////////////

                const tomorrowBirthdays =
                    await Birthday.find({

                        day:
                            tomorrowDay,

                        month:
                            tomorrowMonth
                    });

                //////////////////////////////////////////////////
                // TODAY LOOP
                //////////////////////////////////////////////////

                for (const data of birthdays) {

                    try {

                        //////////////////////////////////////////////////
                        // GUILD
                        //////////////////////////////////////////////////

                        const guild =
                            client.guilds.cache.get(
                                data.guildId
                            );

                        //////////////////////////////////////////////////

                        if (!guild)
                            continue;

                        //////////////////////////////////////////////////
                        // MEMBER
                        //////////////////////////////////////////////////

                        const member =
                            await guild.members.fetch(
                                data.userId
                            )

                            .catch(() => null);

                        //////////////////////////////////////////////////

                        if (!member)
                            continue;

                        //////////////////////////////////////////////////
                        // CONFIG
                        //////////////////////////////////////////////////

                        const config =
                            await BirthdayConfig.findOne({

                                guildId:
                                    guild.id
                            });

                        //////////////////////////////////////////////////

                        if (!config?.channelId)
                            continue;

                        //////////////////////////////////////////////////
                        // CHANNEL
                        //////////////////////////////////////////////////

                        const channel =
                            guild.channels.cache.get(
                                config.channelId
                            );

                        //////////////////////////////////////////////////

                        if (!channel)
                            continue;

                        //////////////////////////////////////////////////
                        // ROLE
                        //////////////////////////////////////////////////

                        if (config?.roleId) {

                            const role =
                                guild.roles.cache.get(
                                    config.roleId
                                );

                            //////////////////////////////////////////////////

                            if (role) {

                                await member.roles.add(role)

                                    .catch(() => null);
                            }
                        }

                        //////////////////////////////////////////////////
                        // ECONOMY REWARD
                        //////////////////////////////////////////////////

                        const economyData =
                            await EconomyUser.findOne({

                                guildId:
                                    guild.id,

                                userId:
                                    member.id
                            });

                        //////////////////////////////////////////////////

                        const reward =
                            5000;

                        //////////////////////////////////////////////////

                        if (economyData) {

                            economyData.wallet += reward;

                            await economyData.save();
                        }

                        //////////////////////////////////////////////////
                        // EMBED
                        //////////////////////////////////////////////////

                        const embed =

                            new EmbedBuilder()

                                .setColor("#ff69b4")

                                .setTitle(
                                    "🎉 Feliz Cumpleaños"
                                )

                                .setDescription(

                                    `🎂 ¡Feliz cumpleaños ${member}!\n\n` +

                                    `🥳 Esperamos que tengas un día increíble lleno de felicidad y regalos.\n\n` +

                                    `🎁 Has recibido **${reward.toLocaleString()} monedas** por tu cumpleaños.`
                                )

                                .setThumbnail(

                                    member.user.displayAvatarURL({

                                        dynamic: true
                                    })
                                )

                                .setFooter({

                                    text:
                                        guild.name
                                })

                                .setTimestamp();

                        //////////////////////////////////////////////////

                        await channel.send({

                            content:
                                `🎉 ¡Hoy celebramos el cumpleaños de ${member}!`,

                            embeds: [embed]
                        });

                    } catch (err) {

                        console.log(
                            "❌ Error Birthday User:",
                            err
                        );
                    }
                }

                //////////////////////////////////////////////////
                // TOMORROW REMINDERS
                //////////////////////////////////////////////////

                for (const data of tomorrowBirthdays) {

                    try {

                        //////////////////////////////////////////////////

                        const guild =
                            client.guilds.cache.get(
                                data.guildId
                            );

                        //////////////////////////////////////////////////

                        if (!guild)
                            continue;

                        //////////////////////////////////////////////////

                        const config =
                            await BirthdayConfig.findOne({

                                guildId:
                                    guild.id
                            });

                        //////////////////////////////////////////////////

                        if (!config?.channelId)
                            continue;

                        //////////////////////////////////////////////////

                        const channel =
                            guild.channels.cache.get(
                                config.channelId
                            );

                        //////////////////////////////////////////////////

                        if (!channel)
                            continue;

                        //////////////////////////////////////////////////

                        await channel.send({

                            content:
                                `📢 ¡Mañana es el cumpleaños de <@${data.userId}>! 🎂🎉`
                        });

                    } catch (err) {

                        console.log(
                            "❌ Error Birthday Reminder:",
                            err
                        );
                    }
                }

            } catch (err) {

                console.log(
                    "❌ Birthday System Error:",
                    err
                );
            }

        },

        //////////////////////////////////////////////////
        // TIMEZONE
        //////////////////////////////////////////////////

        {

            timezone:
                "America/Santo_Domingo"
        }
    );

    //////////////////////////////////////////////////
    // REMOVE BIRTHDAY ROLE
    //////////////////////////////////////////////////

    cron.schedule(

        "59 23 * * *",

        async () => {

            try {

                //////////////////////////////////////////////////

                const configs =
                    await BirthdayConfig.find({

                        roleId: {

                            $ne: null
                        }
                    });

                //////////////////////////////////////////////////

                for (const config of configs) {

                    //////////////////////////////////////////////////

                    const guild =
                        client.guilds.cache.get(
                            config.guildId
                        );

                    //////////////////////////////////////////////////

                    if (!guild)
                        continue;

                    //////////////////////////////////////////////////
                    // ROLE
                    //////////////////////////////////////////////////

                    const role =
                        guild.roles.cache.get(
                            config.roleId
                        );

                    //////////////////////////////////////////////////

                    if (!role)
                        continue;

                    //////////////////////////////////////////////////
                    // MEMBERS
                    //////////////////////////////////////////////////

                    const members =
                        role.members;

                    //////////////////////////////////////////////////

                    for (const member of members.values()) {

                        //////////////////////////////////////////////////

                        await member.roles.remove(role)

                            .catch(() => null);
                    }
                }

            } catch (err) {

                console.log(
                    "❌ Error Removing Birthday Roles:",
                    err
                );
            }

        },

        //////////////////////////////////////////////////

        {

            timezone:
                "America/Santo_Domingo"
        }
    );

    //////////////////////////////////////////////////

    console.log(
        "🎂 Sistema de cumpleaños cargado..."
    );
};