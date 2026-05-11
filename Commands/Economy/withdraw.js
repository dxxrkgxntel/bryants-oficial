const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("retirar")

            .setDescription(
                "Retira dinero del banco"
            )

            .addIntegerOption(o =>

                o.setName("cantidad")

                    .setDescription(
                        "Cantidad a retirar"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////

        const user =

            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // DINERO
        //////////////////////////////////////////////////

        if (
            user.bank < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero en el banco.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // MOVER DINERO
        //////////////////////////////////////////////////

        user.bank -= amount;

        user.wallet += amount;

        //////////////////////////////////////////////////

        await user.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "💸 Retiro realizado"
                )

                .setDescription(

                    `🏦 Has retirado **${amount.toLocaleString()} monedas** de tu banco.\n\n` +

                    `💵 **Wallet:** ${user.wallet.toLocaleString()}\n` +

                    `🏦 **Banco:** ${user.bank.toLocaleString()}`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true,
                        size: 1024
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        "Bryant's Economy System"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};