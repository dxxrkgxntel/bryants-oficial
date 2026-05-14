const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("dados")

            .setDescription(
                "Lanza los dados en el casino"
            )

            .addIntegerOption(option =>

                option

                    .setName("apuesta")

                    .setDescription(
                        "Cantidad a apostar"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // APUESTA
        //////////////////////////////////////////////////

        const bet =
            interaction.options.getInteger(
                "apuesta"
            );

        //////////////////////////////////////////////////
        // USER DATA
        //////////////////////////////////////////////////

        const userData =

            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // VALIDAR DINERO
        //////////////////////////////////////////////////

        if (
            userData.wallet < bet
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero en tu wallet.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎲 Confirmar apuesta"
                )

                .setDescription(

                    `💰 Apuesta:\n` +

`**${bet.toLocaleString()} monedas**\n\n` +

`💵 Wallet actual:\n` +

`**${userData.wallet.toLocaleString()} monedas**\n\n` +

                    `❓ ¿Realmente quieres realizar esta apuesta?`
                )

                //////////////////////////////////////////////////
                // THUMBNAIL
                //////////////////////////////////////////////////

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                //////////////////////////////////////////////////
                // IMAGE
                //////////////////////////////////////////////////

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                //////////////////////////////////////////////////

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BOTONES
        //////////////////////////////////////////////////

        const row =

            new ActionRowBuilder()

                .addComponents(

                    //////////////////////////////////////////////////
                    // CONFIRMAR
                    //////////////////////////////////////////////////

                    new ButtonBuilder()

                        .setCustomId(
                            `dados_confirm_${bet}`
                        )

                        .setLabel(
                            "Confirmar"
                        )

                        .setEmoji("✅")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    //////////////////////////////////////////////////
                    // CANCELAR
                    //////////////////////////////////////////////////

                    new ButtonBuilder()

                        .setCustomId(
                            "dados_cancel"
                        )

                        .setLabel(
                            "Cancelar"
                        )

                        .setEmoji("❌")

                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed],

            components: [row]
        });
    }
};