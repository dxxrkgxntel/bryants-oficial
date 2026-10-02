const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const getUser =
    require("../../Utils/getUser");

const GlobalBank =
    require("../../Models/GlobalBank");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("transferir")

            .setDescription(
                "Transfiere dinero a otro usuario"
            )

            .addUserOption(o =>

                o.setName("usuario")

                    .setDescription(
                        "Usuario destinatario"
                    )

                    .setRequired(true)
            )

            .addIntegerOption(o =>

                o.setName("cantidad")

                    .setDescription(
                        "Cantidad a transferir"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // TARGET
        //////////////////////////////////////////////////

        const target =
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
        // SELF
        //////////////////////////////////////////////////

        if (
            target.id === interaction.user.id
        ) {

            return interaction.reply({

                content:
                    "❌ No puedes transferirte a ti mismo.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // USERS
        //////////////////////////////////////////////////

        const sender =

            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////

        const receiver =

            await getUser(

                interaction.guild.id,
                target.id
            );

        //////////////////////////////////////////////////
        // DINERO TOTAL
        //////////////////////////////////////////////////

        const totalMoney =

            sender.wallet +
            sender.bank;

        //////////////////////////////////////////////////
        // VALIDAR
        //////////////////////////////////////////////////

        if (
            totalMoney < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero entre wallet y banco.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // COMISION
        //////////////////////////////////////////////////

        const tax =
            Math.floor(amount * 0.05);

        //////////////////////////////////////////////////

        const finalAmount =
            amount - tax;

        //////////////////////////////////////////////////
        // EMBED CONFIRMACION
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "💸 Confirmar transferencia"
                )

                .setDescription(

                    `⚠️ ¿Realmente deseas transferir ` +

                    `**${amount.toLocaleString()} monedas** a ${target}?\n\n` +

                    `🏦 Comisión bancaria: ` +

                    `**${tax.toLocaleString()} monedas**\n\n` +

                    `📥 El usuario recibirá: ` +

                    `**${finalAmount.toLocaleString()} monedas**\n\n` +

                    `💵 Wallet: ` +

                    `**${sender.wallet.toLocaleString()}**\n` +

                    `🏦 Banco: ` +

                    `**${sender.bank.toLocaleString()}**`
                )

                .setThumbnail(

                    target.displayAvatarURL({

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
                            "transfer_confirm"
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
                            "transfer_cancel"
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

                withResponse: true
            });

        //////////////////////////////////////////////////
        // MESSAGE
        //////////////////////////////////////////////////

        const response =
            await interaction.fetchReply();

        //////////////////////////////////////////////////
        // COLLECTOR
        //////////////////////////////////////////////////

        const collector =

            response.createMessageComponentCollector({

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
                    "transfer_cancel"

                ) {

                    collector.stop();

                    return i.update({

                        content:
                            "❌ Transferencia cancelada.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // CONFIRMAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "transfer_confirm"

                ) {

                    //////////////////////////////////////////////////
                    // USAR WALLET PRIMERO
                    //////////////////////////////////////////////////

                    if (
                        sender.wallet >= amount
                    ) {

                        sender.wallet -= amount;

                    } else {

                        //////////////////////////////////////////////////
                        // RESTANTE
                        //////////////////////////////////////////////////

                        const remaining =

                            amount -
                            sender.wallet;

                        //////////////////////////////////////////////////

                        sender.wallet = 0;

                        sender.bank -= remaining;
                    }

                    //////////////////////////////////////////////////
                    // RECIBIR
                    //////////////////////////////////////////////////

                    receiver.wallet += finalAmount;

                    //////////////////////////////////////////////////
                    // GLOBAL BANK
                    //////////////////////////////////////////////////

                    let globalBank =
                        await GlobalBank.findOne();

                    //////////////////////////////////////////////////

                    if (!globalBank) {

                        globalBank =
                            new GlobalBank({

                                balance: 0
                            });
                    }

                    //////////////////////////////////////////////////

                    globalBank.balance += tax;

                    //////////////////////////////////////////////////
                    // SAVE
                    //////////////////////////////////////////////////

                    await sender.save();

                    await receiver.save();

                    await globalBank.save();

                    //////////////////////////////////////////////////
                    // SUCCESS EMBED
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor("#00ff99")

                            .setTitle(
                                "🔁 Transferencia realizada"
                            )

                            .setDescription(

                                `💸 Has transferido ` +

                                `**${amount.toLocaleString()} monedas** a ${target}.\n\n` +

                                `🏦 Comisión bancaria: ` +

                                `**${tax.toLocaleString()} monedas**\n\n` +

                                `📥 El usuario recibió: ` +

                                `**${finalAmount.toLocaleString()} monedas**\n\n` +

                                `💵 **Wallet:** ` +

                                `${sender.wallet.toLocaleString()}\n` +

                                `🏦 **Banco:** ` +

                                `${sender.bank.toLocaleString()}`
                            )

                            .setThumbnail(

                                target.displayAvatarURL({

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

                    await response.edit({

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