const {
    ActivityType
} = require('discord.js');

const mongoose =
    require('mongoose');

const config =
    require('../../config.json');

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
        // PRESENCIAS
        //////////////////////////////////////////////////

        const activities = [

            {
                name:
                    `💜 || ${client.guilds.cache.size} servidores`,
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
            15000
        );
    }
};