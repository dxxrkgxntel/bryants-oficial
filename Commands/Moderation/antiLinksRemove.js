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
                "antilinks-remove"
            )

            .setDescription(
                "Quitar canal permitido"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////

            .addChannelOption(option =>

                option

                    .setName(
                        "canal"
                    )

                    .setDescription(
                        "Canal a quitar"
                    )

                    .setRequired(true)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////

        const channel =
            interaction.options.getChannel(
                "canal"
            );

        //////////////////////////////////////////////////

        const data =
            await AntiLinksConfig.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ No hay configuración.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        data.allowedChannels =
            data.allowedChannels.filter(

                id =>
                    id !== channel.id
            );

        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////

        await interaction.reply({

            content:

                `✅ ${channel} removido de canales permitidos.`,

            flags: 64
        });
    }
};