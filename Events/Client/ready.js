const {
    ActivityType
} = require('discord.js');

const mongoose =
    require('mongoose');

const config =
    require('../../config.json');

const WeeklyDrop = require('../../Models/WeeklyDrop');
const Economy = require('../../Models/EconomyUser');

const WEEKLYDROP_BANNER = 'https://i.imgur.com/w7LzzI0.png';

require('colors');

module.exports = {

    name: 'clientReady',

    once: true,

    async execute(client) {

        //////////////////////////////////////////////////
        // MONGODB
        //////////////////////////////////////////////////

        try {

            mongoose.set(
                'strictQuery',
                true
            );

            await mongoose.connect(
                config.dataBaseURL,
                {
                    keepAlive: true
                }
            );

            console.log(
                '[MONGO DB] Conectado correctamente.'
                .green
            );

        } catch (error) {

            console.log(
                '[MONGO DB ERROR]'
                .red,
                error
            );
        }

        //////////////////////////////////////////////////
        // WEEKLY DROP AUTOMÁTICO
        //////////////////////////////////////////////////

        const runWeeklyDrops = async () => {
            try {
                const now = new Date();
                const drops = await WeeklyDrop.find({
                    enabled: true,
                    nextDrop: { $ne: null, $lte: now }
                });

                for (const data of drops) {
                    const guild = client.guilds.cache.get(data.guildId);
                    if (!guild) continue;
                    if (!Number.isFinite(data.minAmount) || !Number.isFinite(data.maxAmount) || data.minAmount < 1 || data.minAmount >= data.maxAmount) continue;

                    try {
                        const members = await guild.members.fetch();
                        const humans = [...members.values()].filter(member => !member.user.bot);
                        let totalDistributed = 0;

                        const operations = humans.map(member => {
                            const amount = Math.floor(Math.random() * (data.maxAmount - data.minAmount + 1)) + data.minAmount;
                            totalDistributed += amount;
                            return {
                                updateOne: {
                                    filter: { guildId: guild.id, userId: member.id },
                                    update: { $inc: { wallet: amount }, $setOnInsert: { guildId: guild.id, userId: member.id } },
                                    upsert: true
                                }
                            };
                        });

                        if (operations.length) await Economy.bulkWrite(operations, { ordered: false });

                        data.lastDrop = new Date();
                        data.nextDrop = new Date(Date.now() + 604800000);
                        await data.save();

                        const channel = data.logChannelId ? guild.channels.cache.get(data.logChannelId) : null;
                        if (channel && channel.isTextBased()) {
                            await channel.send({
                                components: [{
                                    type: 17,
                                    accent_color: 0x8A2BE2,
                                    components: [
                                        { type: 12, items: [{ media: { url: WEEKLYDROP_BANNER } }] },
                                        { type: 10, content: "## 🪙 Drop semanal automático" },
                                        { type: 14, divider: true, spacing: 1 },
                                        { type: 10, content: "**Usuarios recompensados:** " + humans.length + "\n**Total distribuido:** " + totalDistributed.toLocaleString() + " coins\n**Rango:** " + data.minAmount.toLocaleString() + " - " + data.maxAmount.toLocaleString() + "\n**Próximo drop:** <t:" + Math.floor(data.nextDrop.getTime() / 1000) + ":R>" }
                                    ]
                                }],
                                flags: 32768
                            }).catch(error => console.error('[WeeklyDrop Log]', error));
                        }
                    } catch (error) {
                        console.error('[WeeklyDrop Guild]', data.guildId, error);
                    }
                }
            } catch (error) {
                console.error('[WeeklyDrop Scheduler]', error);
            }
        };

        await runWeeklyDrops();
        setInterval(runWeeklyDrops, 60 * 60 * 1000);

        //////////////////////////////////////////////////
        // PRESENCIAS
        //////////////////////////////////////////////////

        const activities = [

            {
                name:
                    `💜 || Estoy en ${client.guilds.cache.size} servidores`,
                type:
                    ActivityType.Watching
            },

            {
                name:
                    '💜 || Sistema de Tickets',
                type:
                    ActivityType.Listening
            },

            {
                name:
                    '💜 || Desenvolvido por @bryantdx',
                type:
                    ActivityType.Playing
            },

            {
                name:
                    '💜 || Staff 24/7',
                type:
                    ActivityType.Competing
            },

            {
                name:
                    "💜 || Bryant's Oficial",
                type:
                    ActivityType.Playing
            }
        ];

        //////////////////////////////////////////////////
        // ACTUALIZAR PRESENCIA
        //////////////////////////////////////////////////

        let index = 0;

        const updatePresence = async () => {

            try {

                const activity =
                    activities[index];

                await client.user.setPresence({

                    activities: [
                        {
                            name:
                                activity.name,

                            type:
                                activity.type
                        }
                    ],

                    status: 'online'
                });

                index++;

                if (
                    index >= activities.length
                ) {
                    index = 0;
                }

            } catch (error) {

                console.log(
                    '[PRESENCE ERROR]'
                    .red,
                    error
                );
            }
        };

        //////////////////////////////////////////////////
        // PRIMERA PRESENCIA
        //////////////////////////////////////////////////

        updatePresence();

        //////////////////////////////////////////////////
        // INTERVALO
        //////////////////////////////////////////////////

        setInterval(
            updatePresence,
            2000
        );
    }
};