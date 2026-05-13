const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Birthday =
    require("../../Models/Birthday");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("birthday-list")

            .setDescription(
                "Lista de cumpleaños registrados"
            ),

    async execute(interaction) {

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

        const description =
            birthdays.map((b, i) =>

                `\`${i + 1}.\` <@${b.userId}> • 🎂 ${b.birthday}`

            ).join("\n");

        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎂 Lista de Cumpleaños"
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