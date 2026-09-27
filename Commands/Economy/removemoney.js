const {
    SlashCommandBuilder,
    PermissionFlagsBits,
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

            .setName("quitar-dinero")

            .setDescription(
                "Quita dinero a un usuario"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            .addUserOption(option =>

                option.setName("usuario")

                    .setDescription(
                        "Usuario"
                    )

                    .setRequired(true)
            )

            .addIntegerOption(option =>

                option.setName("cantidad")

                    .setDescription(
                        "Cantidad"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const user =
            interaction.options.getUser(
                "usuario"
            );

        //////////////////////////////////////////////////
        // AMOUNT
        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const userData =

            await getUser(

                interaction.guild.id,
                user.id
            );

        //////////////////////////////////////////////////
        // VALIDAR
        //////////////////////////////////////////////////

        if (
            userData.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ El usuario no tiene suficiente dinero.",

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
                    "💸 Confirmar quitar dinero"
                )

                .setDescription(

                    `⚠️ ¿Deseas quitar ` +

                    `**${amount.toLocaleString()} monedas** a ${user}?\n\n` +

                    `💵 Wallet actual: ` +

                    `**${userData.wallet.toLocaleString()} monedas**`
                )

                .setThumbnail(

                    user.displayAvatarURL({

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
                            "removemoney_confirm"
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
                            "removemoney_cancel"
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
                    "removemoney_cancel"

                ) {

                    collector.stop();

                    return i.update({

                        content:
                            "❌ Operación cancelada.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // CONFIRMAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "removemoney_confirm"

                ) {

                    //////////////////////////////////////////////////
                    // QUITAR
                    //////////////////////////////////////////////////

                    userData.wallet -= amount;

                    //////////////////////////////////////////////////

                    await userData.save();

                    //////////////////////////////////////////////////
                    // SUCCESS
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor("#ff0000")

                            .setTitle(
                                "💸 Dinero removido"
                            )

                            .setDescription(

                                `❌ Se quitaron ` +

                                `**${amount.toLocaleString()} monedas** a ${user}.\n\n` +

                                `💵 Wallet actual: ` +

                                `**${userData.wallet.toLocaleString()} monedas**`
                            )

                            .setThumbnail(

                                user.displayAvatarURL({

                                    dynamic: true,
                                    size: 1024
                                })
                            )

                            .setFooter({

                                text:
                                    `Acción realizada por ${interaction.user.username}`
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