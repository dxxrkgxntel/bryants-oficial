const {
    SlashCommandBuilder
} = require("discord.js");

const Birthday =
    require("../../Models/Birthday");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("birthday-remove")

            .setDescription(
                "Elimina tu cumpleaños registrado"
            ),

    async execute(interaction) {

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
                    "❌ No tienes un cumpleaños registrado.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        await Birthday.deleteOne({

            guildId:
                interaction.guild.id,

            userId:
                interaction.user.id
        });

        //////////////////////////////////////////////////

        await interaction.reply({

            content:
                "🗑️ Tu cumpleaños fue eliminado correctamente.",

            flags: 64
        });
    }
};