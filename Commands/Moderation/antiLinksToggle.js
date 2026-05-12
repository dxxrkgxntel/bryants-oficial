const {

    SlashCommandBuilder,
    PermissionFlagsBits

} = require("discord.js");

const AntiLinksConfig =
    require("../../Models/AntiLinksConfig");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "antilinks-toggle"
            )

            .setDescription(
                "Activar o desactivar AntiLinks"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////

        let data =
            await AntiLinksConfig.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            data =
                await AntiLinksConfig.create({

                    guildId:
                        interaction.guild.id
                });
        }

        //////////////////////////////////////////////////

        data.enabled =
            !data.enabled;

        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////

        await interaction.reply({

            content:

                `✅ AntiLinks ahora está ${
                    data.enabled
                        ? "activado"
                        : "desactivado"
                }.`,

            flags: 64
        });
    }
};