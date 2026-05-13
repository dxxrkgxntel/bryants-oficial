const {
    SlashCommandBuilder
} = require("discord.js");

const Birthday =
    require("../../Models/Birthday");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("birthday-edit")

            .setDescription(
                "Edita tu cumpleaños"
            )

            .addStringOption(option =>

                option

                    .setName("fecha")

                    .setDescription(
                        "Formato: DD/MM"
                    )

                    .setRequired(true)
            ),

    async execute(interaction) {

        //////////////////////////////////////////////////

        const date =
            interaction.options.getString(
                "fecha"
            );

        //////////////////////////////////////////////////

        const regex =
            /^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])$/;

        //////////////////////////////////////////////////

        if (!regex.test(date)) {

            return interaction.reply({

                content:
                    "❌ Usa el formato correcto: `DD/MM`",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        const data =
            await Birthday.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    interaction.user.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ No tienes cumpleaños registrado.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        data.birthday =
            date;

        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////

        await interaction.reply({

            content:
                `🎂 Tu cumpleaños fue actualizado a **${date}**`,

            flags: 64
        });
    }
};