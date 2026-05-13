const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Birthday =
    require("../../Models/Birthday");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "birthday-next"
            )

            .setDescription(
                "Muestra los próximos cumpleaños"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // FIND
        //////////////////////////////////////////////////

        const birthdays =
            await Birthday.find({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (!birthdays.length) {

            return interaction.reply({

                content:
                    "❌ No hay cumpleaños registrados.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // TODAY
        //////////////////////////////////////////////////

        const now =
            new Date();

        //////////////////////////////////////////////////

        const currentMonth =
            now.getMonth() + 1;

        //////////////////////////////////////////////////

        const currentDay =
            now.getDate();

        //////////////////////////////////////////////////
        // SORT
        //////////////////////////////////////////////////

        birthdays.sort((a, b) => {

            const dateA =
                new Date(

                    now.getFullYear(),
                    a.month - 1,
                    a.day
                );

            const dateB =
                new Date(

                    now.getFullYear(),
                    b.month - 1,
                    b.day
                );

            //////////////////////////////////////////////////

            if (
                dateA < now
            ) {

                dateA.setFullYear(
                    now.getFullYear() + 1
                );
            }

            //////////////////////////////////////////////////

            if (
                dateB < now
            ) {

                dateB.setFullYear(
                    now.getFullYear() + 1
                );
            }

            //////////////////////////////////////////////////

            return dateA - dateB;
        });

        //////////////////////////////////////////////////
        // TOP 10
        //////////////////////////////////////////////////

        const nextBirthdays =
            birthdays.slice(0, 10);

        //////////////////////////////////////////////////
        // DESCRIPTION
        //////////////////////////////////////////////////

        const description =
            nextBirthdays.map((b, i) => {

                return (

                    `🎂 <@${b.userId}>\n` +

                    `> 📅 ${b.day}/${b.month}`
                );

            }).join("\n\n");

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#ff69b4")

                .setTitle(
                    "🎉 Próximos Cumpleaños"
                )

                .setDescription(
                    description
                )

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};