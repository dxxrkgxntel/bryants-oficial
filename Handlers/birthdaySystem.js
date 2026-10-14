const cron =
    require("node-cron");

const Birthday =
    require("../Models/Birthday");

const BirthdayConfig =
    require("../Models/BirthdayConfig");

const EconomyUser =
    require("../Models/EconomyUser");

const { buildBirthdayNotification, renderBirthdayReminder } = require("../Functions/birthdayNotification");

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

                        const reward = Number.isFinite(config.birthdayReward) ? config.birthdayReward : 0;

                        //////////////////////////////////////////////////

                        if (economyData) {

                            economyData.wallet += reward;

                            await economyData.save();
                        }

                        //////////////////////////////////////////////////
                        // EMBED
                        //////////////////////////////////////////////////

                        const payload = buildBirthdayNotification(config, guild, member, reward);
                        if (payload) await channel.send(payload);

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

                        const reminder = renderBirthdayReminder(config, guild, { id: data.userId });
                        if (reminder) await channel.send({ content: reminder, allowedMentions: { users: [data.userId] } });

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
        "[BIRTHDAY] Cargado correctamente."
    );
};
