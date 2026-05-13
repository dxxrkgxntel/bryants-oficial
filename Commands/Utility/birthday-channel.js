const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const BirthdayConfig =
    require("../../Models/BirthdayConfig");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "birthday-channel"
            )

            .setDescription(
                "Configurar canal de cumpleaños"
            )

            //////////////////////////////////////////////////
            // ADMIN
            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            .addChannelOption(option =>

                option

                    .setName("canal")

                    .setDescription(
                        "Canal para felicitaciones"
                    )

                    .addChannelTypes(
                        ChannelType.GuildText
                    )

                    .setRequired(true)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // CHANNEL
        //////////////////////////////////////////////////

        const channel =
            interaction.options.getChannel(
                "canal"
            );

        //////////////////////////////////////////////////
        // FIND OR CREATE
        //////////////////////////////////////////////////

        let data =
            await BirthdayConfig.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            data =
                new BirthdayConfig({

                    guildId:
                        interaction.guild.id
                });
        }

        //////////////////////////////////////////////////
        // SAVE CHANNEL
        //////////////////////////////////////////////////

        data.channelId =
            channel.id;

        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎂 Canal configurado"
                )

                .setDescription(

                    `✅ Las felicitaciones de cumpleaños ahora se enviarán en ${channel}`
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