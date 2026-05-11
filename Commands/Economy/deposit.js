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
        // VALIDAR DINERO
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
        // EMBED CONFIRMACION
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🏦 Confirmar depósito"
                )

                .setDescription(

                    `⚠️ ¿Realmente deseas depositar ` +

                    `**${amount.toLocaleString()} monedas** en el banco?\n\n` +

                    `💵 Wallet actual: ` +

                    `**${user.wallet.toLocaleString()} monedas**`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true,
                        size: 1024
                    })
                )

                .setFooter({

                    text:
                        "Tienes 30 segundos para responder"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BOTONES
        //////////////////////////////////////////////////

        const row =

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "deposit_confirm"
                        )

                        .setLabel(
                            "Confirmar"
                        )

                        .setEmoji("✅")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "deposit_cancel"
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
        // SEND
        //////////////////////////////////////////////////

        const msg =
            await interaction.reply({

                embeds: [embed],

                components: [row],

                fetchReply: true
            });

        //////////////////////////////////////////////////
        // COLLECTOR
        //////////////////////////////////////////////////

        const collector =

            msg.createMessageComponentCollector({

                time: 30000
            });

        //////////////////////////////////////////////////
        // COLLECT
        //////////////////////////////////////////////////

        collector.on(

            "collect",

            async i => {

                ////////////////////////////////////////////////
                // SOLO AUTOR
                ////////////////////////////////////////////////

                if (

                    i.user.id !==
                    interaction.user.id

                ) {

                    return i.reply({

                        content:
                            "❌ No puedes usar estos botones.",

                        flags: 64
                    });
                }

                ////////////////////////////////////////////////
                // CANCELAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "deposit_cancel"

                ) {

                    collector.stop();

                    return i.update({

                        content:
                            "❌ Depósito cancelado.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // CONFIRMAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "deposit_confirm"

                ) {

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
                    // EMBED SUCCESS
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor("#00ff99")

                            .setTitle(
                                "🏦 Depósito realizado"
                            )

                            .setDescription(

                                `💸 Has depositado ` +

                                `**${amount.toLocaleString()} monedas** en tu banco.\n\n` +

                                `💵 **Wallet:** ` +

                                `${user.wallet.toLocaleString()}\n` +

                                `🏦 **Banco:** ` +

                                `${user.bank.toLocaleString()}`
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

                    collector.stop();

                    //////////////////////////////////////////////////

                    return i.update({

                        embeds: [successEmbed],

                        components: []
                    });
                }
            }
        );

        //////////////////////////////////////////////////
        // TIMEOUT
        //////////////////////////////////////////////////

        collector.on(

            "end",

            async (_, reason) => {

                if (
                    reason === "time"
                ) {

                    await msg.edit({

                        content:
                            "⌛ Tiempo agotado.",

                        embeds: [],

                        components: []

                    }).catch(() => {});
                }
            }
        );
    }
};