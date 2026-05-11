const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const GlobalBank =
    require("../../Models/GlobalBank");

const EconomyUser =
    require("../../Models/EconomyUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("repartir-global")

            .setDescription(
                "Entrega dinero desde el banco global"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            .addUserOption(o =>

                o.setName("usuario")

                    .setDescription(
                        "Usuario que recibirá el dinero"
                    )

                    .setRequired(true)
            )

            .addIntegerOption(o =>

                o.setName("cantidad")

                    .setDescription(
                        "Cantidad a entregar"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const target =
            interaction.options.getUser(
                "usuario"
            );

        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////
        // GLOBAL BANK
        //////////////////////////////////////////////////

        let globalBank =

            await GlobalBank.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (!globalBank) {

            return interaction.reply({

                content:
                    "❌ El banco global no existe aún.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // VALIDAR BALANCE
        //////////////////////////////////////////////////

        if (
            globalBank.balance < amount
        ) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "🏦 Fondos insuficientes"
                        )

                        .setDescription(

                            `El banco global no tiene suficientes monedas.\n\n` +

                            `💰 Balance actual:\n` +

                            `> ${globalBank.balance.toLocaleString()} monedas`
                        )
                ],

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#FFD700")

                .setTitle(
                    "🏦 Confirmar distribución"
                )

                .setDescription(

                    `¿Deseas entregar dinero desde el banco global?\n\n` +

                    `👤 **Usuario**\n` +

                    `> ${target}\n\n` +

                    `💰 **Cantidad**\n` +

                    `> ${amount.toLocaleString()} monedas`
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
                            "global_confirm"
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
                            "global_cancel"
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

                //////////////////////////////////////////////////
                // EVITAR ERROR
                //////////////////////////////////////////////////

                await i.deferUpdate();

                //////////////////////////////////////////////////
                // SOLO AUTOR
                //////////////////////////////////////////////////

                if (
                    i.user.id !== interaction.user.id
                ) {

                    return;
                }

                //////////////////////////////////////////////////
                // CANCELAR
                //////////////////////////////////////////////////

                if (
                    i.customId ===
                    "global_cancel"
                ) {

                    collector.stop();

                    return msg.edit({

                        content:
                            "❌ Operación cancelada.",

                        embeds: [],

                        components: []
                    });
                }

                //////////////////////////////////////////////////
                // CONFIRMAR
                //////////////////////////////////////////////////

                if (
                    i.customId ===
                    "global_confirm"
                ) {

                    //////////////////////////////////////////////////
                    // USER DATA
                    //////////////////////////////////////////////////

                    let userData =

                        await EconomyUser.findOne({

                            guildId:
                                interaction.guild.id,

                            userId:
                                target.id
                        });

                    //////////////////////////////////////////////////

                    if (!userData) {

                        userData =
                            new EconomyUser({

                                guildId:
                                    interaction.guild.id,

                                userId:
                                    target.id,

                                wallet: 0,

                                bank: 0
                            });
                    }

                    //////////////////////////////////////////////////
                    // DAR DINERO
                    //////////////////////////////////////////////////

                    userData.wallet += amount;

                    //////////////////////////////////////////////////
                    // QUITAR GLOBAL
                    //////////////////////////////////////////////////

                    globalBank.balance -= amount;

                    globalBank.totalDistributed += amount;

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
                                "🏦 Dinero distribuido"
                            )

                            .setDescription(

                                `El banco global entregó monedas exitosamente.\n\n` +

                                `👤 **Usuario beneficiado**\n` +

                                `> ${target}\n\n` +

                                `💰 **Cantidad entregada**\n` +

                                `> ${amount.toLocaleString()} monedas\n\n` +

                                `🏦 **Nuevo balance global**\n` +

                                `> ${globalBank.balance.toLocaleString()} monedas`
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
                                    "Bryant's Global Bank"
                            })

                            .setTimestamp();

                    //////////////////////////////////////////////////

                    collector.stop();

                    //////////////////////////////////////////////////

                    return msg.edit({

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