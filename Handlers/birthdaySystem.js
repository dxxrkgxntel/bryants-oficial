const cron =
    require("node-cron");

const Birthday =
    require("../Models/Birthday");

module.exports = (client) => {

    //////////////////////////////////////////////////

    cron.schedule("0 0 * * *", async () => {

        //////////////////////////////////////////////////
        // FECHA ACTUAL
        //////////////////////////////////////////////////

        const now =
            new Date();

        //////////////////////////////////////////////////

        const day =
            String(now.getDate())
                .padStart(2, "0");

        //////////////////////////////////////////////////

        const month =
            String(now.getMonth() + 1)
                .padStart(2, "0");

        //////////////////////////////////////////////////

        const today =
            `${day}/${month}`;

        //////////////////////////////////////////////////
        // BUSCAR
        //////////////////////////////////////////////////

        const birthdays =
            await Birthday.find({

                birthday:
                    today
            });

        //////////////////////////////////////////////////

        for (const data of birthdays) {

            //////////////////////////////////////////////////

            const guild =
                client.guilds.cache.get(
                    data.guildId
                );

            //////////////////////////////////////////////////

            if (!guild)
                continue;

            //////////////////////////////////////////////////

            const member =
                await guild.members.fetch(
                    data.userId
                ).catch(() => null);

            //////////////////////////////////////////////////

            if (!member)
                continue;

            //////////////////////////////////////////////////
            // CANAL
            //////////////////////////////////////////////////

            const channel =
                guild.systemChannel;

            //////////////////////////////////////////////////

            if (!channel)
                continue;

            //////////////////////////////////////////////////

            channel.send({

                content:

                    `🎉 ¡Feliz cumpleaños <@${member.id}>! 🎂\n\n` +

                    `Que tengas un día increíble 🥳`
            });
        }

    });

    //////////////////////////////////////////////////

    console.log(
        "🎂 Birthday System Loaded"
    );
};