const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("depositar")

            .setDescription(
                "Deposita dinero en el banco"
            )

            .addIntegerOption(o =>

                o.setName("cantidad")

                    .setDescription(
                        "Cantidad a depositar"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // AMOUNT
        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////
        // USER
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
            user.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // MOVER DINERO
        //////////////////////////////////////////////////

        user.wallet -= amount;

        user.bank += amount;

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await user.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🏦 Depósito realizado"
                )

                .setDescription(

                    `💸 Has depositado **${amount.toLocaleString()} monedas** en tu banco.\n\n` +

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