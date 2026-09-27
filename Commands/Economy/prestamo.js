const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const GlobalBank =
    require("../../Models/GlobalBank");

const updateDebt =
    require("../../utils/updateDebt");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("prestamo")

            .setDescription(
                "Solicita un préstamo al banco"
            )

            .addIntegerOption(option =>

                option

                    .setName("cantidad")

                    .setDescription(
                        "Cantidad a solicitar"
                    )

                    .setRequired(true)

                    .setMinValue(1000)
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

        const userData =

            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // ACTUALIZAR DEUDA
        //////////////////////////////////////////////////

        await updateDebt(
            userData
        );

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
        // MAXIMO
        //////////////////////////////////////////////////

        const maxLoan =
            500000;

        //////////////////////////////////////////////////
        // VALIDAR MAXIMO
        //////////////////////////////////////////////////

        if (
            amount > maxLoan
        ) {

            return interaction.reply({

                content:
                    `❌ El préstamo máximo es de ${maxLoan.toLocaleString()} monedas.`,

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // YA TIENE DEUDA
        //////////////////////////////////////////////////

        if (
            userData.debt > 0 ||
            userData.loanTaken
        ) {

            return interaction.reply({

                content:
                    `❌ Ya tienes una deuda activa de ${userData.debt.toLocaleString()} monedas.\n\nDebes pagarla antes de solicitar otro préstamo.`,

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // FONDOS DEL BANCO
        //////////////////////////////////////////////////

        if (
            globalBank.balance < amount
        ) {

            return interaction.reply({

                content:
                    "❌ El banco global no tiene suficientes fondos actualmente.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // INTERES BASE
        //////////////////////////////////////////////////

        const interest =
            Math.floor(amount * 0.20);

        //////////////////////////////////////////////////

        const finalDebt =
            amount + interest;

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🏦 Solicitud de préstamo"
                )

                .setDescription(

                    `💰 Cantidad solicitada:\n` +

                    `**${amount.toLocaleString()} monedas**\n\n` +

                    `📈 Interés inicial:\n` +

                    `**${interest.toLocaleString()} monedas (20%)**\n\n` +

                    `📉 Deuda inicial:\n` +

                    `**${finalDebt.toLocaleString()} monedas**\n\n` +

                    `⚠️ Mientras más tardes en pagar, más intereses se acumularán automáticamente.\n\n` +

                    `¿Deseas continuar?`
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
                            "loan_accept"
                        )

                        .setLabel(
                            "Aceptar"
                        )

                        .setEmoji("✅")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "loan_cancel"
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

            components: [row],

            withResponse: true
        });

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
                    "loan_cancel"

                ) {

                    collector.stop();

                    return i.update({

                        content:
                            "❌ Solicitud cancelada.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // ACEPTAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "loan_accept"

                ) {

                    //////////////////////////////////////////////////
                    // DAR DINERO
                    //////////////////////////////////////////////////

                    userData.wallet += amount;

                    //////////////////////////////////////////////////
                    // DEUDA
                    //////////////////////////////////////////////////

                    userData.debt =
                        finalDebt;

                    //////////////////////////////////////////////////

                    userData.loanTaken =
                        true;

                    //////////////////////////////////////////////////
                    // FECHA PRESTAMO
                    //////////////////////////////////////////////////

                    userData.loanDate =
                        new Date();

                    //////////////////////////////////////////////////
                    // BANCO GLOBAL
                    //////////////////////////////////////////////////

                    globalBank.balance -= amount;

                    //////////////////////////////////////////////////
                    // SAVE
                    //////////////////////////////////////////////////

                    await userData.save();

                    await globalBank.save();

                    //////////////////////////////////////////////////
                    // SUCCESS
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor("#00ff99")

                            .setTitle(
                                "🏦 Préstamo aprobado"
                            )

                            .setDescription(

                                `💰 Has recibido:\n` +

                                `**${amount.toLocaleString()} monedas**\n\n` +

                                `📉 Deuda inicial:\n` +

                                `**${finalDebt.toLocaleString()} monedas**\n\n` +

                                `📈 Tu deuda aumentará automáticamente con el tiempo hasta que sea pagada.\n\n` +

                                `⚠️ Usa \`/pagar-deuda\` para reducirla antes de que siga creciendo.`
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
                                    "Bryant's Bank System"
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