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
                "antilinks-setup"
            )

            .setDescription(
                "Configurar AntiLinks"
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
                        "Canal permitido para links"
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
                        interaction.guild.id,

                    allowedChannels: [
                        channel.id
                    ]
                });

        } else {

            //////////////////////////////////////////////////

            if (
                !data.allowedChannels.includes(
                    channel.id
                )
            ) {

                data.allowedChannels.push(
                    channel.id
                );

                await data.save();
            }
        }

        //////////////////////////////////////////////////

        await interaction.reply({

            content:

                `✅ ${channel} ahora permite links.`,

            flags: 64
        });
    }
};