const cron = require("node-cron");

const WeeklyDrop =
require("../../Models/WeeklyDrop");

const Economy =
require("../../Models/EconomyUser");

module.exports = {

    name: "clientReady",
    once: true,

    async execute(client) {

        console.log(
            "[WEEKLYDROP] Cargado correctamente.".green
        );

        cron.schedule(
            "0 0 * * 0",
            async () => {

                console.log(
                    "🪙 Ejecutando drops semanales..."
                );

                const guilds =
                await WeeklyDrop.find({
                    enabled: true
                });

                for (const config of guilds) {

                    try {

                        const guild =
                        client.guilds.cache.get(
                            config.guildId
                        );

                        if (!guild) continue;

                        const members =
                        await guild.members.fetch();

                        let totalDistributed = 0;
                        let rewardedUsers = 0;

                        for (const member of members.values()) {

                            if (member.user.bot)
                                continue;

                            const amount =
                                Math.floor(
                                    Math.random() *
                                    (
                                        config.maxAmount -
                                        config.minAmount + 1
                                    )
                                ) + config.minAmount;

                            let userData =
                            await Economy.findOne({

                                guildId: guild.id,

                                userId: member.id

                            });

                            if (!userData) {

                                userData =
                                await Economy.create({

                                    guildId: guild.id,

                                    userId: member.id,

                                    balance: 0

                                });

                            }

                            userData.balance += amount;

                            await userData.save();

                            totalDistributed += amount;

                            rewardedUsers++;

                        }

                        config.lastDrop =
                        new Date();

                        config.nextDrop =
                        new Date(
                            Date.now() +
                            7 * 24 * 60 * 60 * 1000
                        );

                        await config.save();

                        if (config.logChannelId) {

                            const channel =
                            guild.channels.cache.get(
                                config.logChannelId
                            );

                            if (channel) {

                                channel.send({

                                    embeds: [{

                                        color: 0x00ff99,

                                        title:
                                        "🪙 Weekly Drop Repartido",

                                        description:

`✅ Usuarios recompensados: **${rewardedUsers}**
💰 Total distribuido: **${totalDistributed.toLocaleString()}** coins

⏳ Próximo drop:
<t:${Math.floor(config.nextDrop.getTime() / 1000)}:R>`,

                                        timestamp:
                                        new Date()

                                    }]

                                });

                            }

                        }

                        console.log(
                            `✅ Drop semanal enviado en ${guild.name}`
                        );

                    }

                    catch (err) {

                        console.error(
                            `❌ Error en guild ${config.guildId}`,
                            err
                        );

                    }

                }

            }

        );

    }

};