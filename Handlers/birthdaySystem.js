const cron =
    require("node-cron");
const mongoose = require("mongoose");

const Birthday =
    require("../Models/Birthday");

const BirthdayConfig =
    require("../Models/BirthdayConfig");

const EconomyUser =
    require("../Models/EconomyUser");
const EconomyEarningTransaction = require("../Models/EconomyEarningTransaction");

const { buildBirthdayNotification, renderBirthdayReminder } = require("../Functions/birthdayNotification");
const { trackAchievementProgress } = require("../Functions/achievementTracker");
const { recordEconomyEarning } = require("../Functions/economyEarningMetrics");
const { getZonedDateParts, getNextZonedDateParts } = require("../Functions/birthdayDates");

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

                const today = getZonedDateParts(now);
                const day = today.day;
                const month = today.month;
                const year = today.year;

                //////////////////////////////////////////////////
                // TOMORROW
                //////////////////////////////////////////////////

                const tomorrow = getNextZonedDateParts(now);
                const tomorrowDay = tomorrow.day;
                const tomorrowMonth = tomorrow.month;

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

                        if (data.lastCelebratedYear === year) continue;

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

                        const economyData = await EconomyUser.findOne({ guildId: guild.id, userId: member.id });
                        const reward = Number.isFinite(config.birthdayReward) ? config.birthdayReward : 0;
                        const payload = buildBirthdayNotification(config, guild, member, reward);
                        if (!payload) continue;

                        // Reclama el año y acredita el premio una sola vez dentro de la misma transacción.
                        const session = await mongoose.startSession();
                        let claimed = false;
                        try {
                            await session.withTransaction(async () => {
                                const claim = await Birthday.updateOne(
                                    { _id: data._id, lastCelebratedYear: { $ne: year } },
                                    { $set: { lastCelebratedYear: year } },
                                    { session }
                                );
                                if (!(claim.modifiedCount || claim.nModified)) return;
                                if (economyData && reward > 0) {
                                    await EconomyUser.updateOne({ _id: economyData._id }, { $inc: { wallet: reward } }, { session });
                                    await EconomyEarningTransaction.updateOne(
                                        { guildId: guild.id, userId: member.id, operationId: "birthday:" + year },
                                        { $setOnInsert: {
                                            guildId: guild.id, userId: member.id,
                                            operationId: "birthday:" + year,
                                            category: "birthday_reward", amount: reward
                                        } },
                                        { upsert: true, session }
                                    );
                                }
                                claimed = true;
                            });
                        } finally {
                            await session.endSession();
                        }
                        if (!claimed) continue;
                        if (economyData && reward > 0) await recordEconomyEarning({
                            guild, user: member.user, amount: reward,
                            category: "birthday_reward", operationId: "birthday:" + year
                        }).catch(error => console.warn("[Economy] No se pudo sincronizar recompensa de cumpleaños:", error.message));

                        await channel.send(payload);
                        await trackAchievementProgress(guild, member.user, "birthday_celebrations", 1)
                            .catch(error => console.warn("[Achievements] No se pudo registrar birthday_celebrations:", error.message));
                        }

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
