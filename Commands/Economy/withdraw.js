const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const getUser =
    require("../../Utils/getUser");

const EconomyUser =
    require("../../Models/EconomyUser");

const GlobalBank =
    require("../../Models/GlobalBank");

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
            user.bank < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero en el banco.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
// COMISION
//////////////////////////////////////////////////

const withdrawFee = 0.05;

//////////////////////////////////////////////////

const fee = Math.floor(

    amount *
    withdrawFee
);

//////////////////////////////////////////////////

const finalAmount =
    amount - fee;

        //////////////////////////////////////////////////
        // EMBED CONFIRMACION
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🏦 Confirmar retiro"
                )

                .setDescription(

                    `⚠️ ¿Realmente deseas retirar ` +

                    `**${amount.toLocaleString()} monedas**?\n\n` +

                    `💸 Comisión bancaria: ` +

                    `**${fee.toLocaleString()} monedas**\n\n` +

                    `✅ Recibirás: ` +

                    `**${finalAmount.toLocaleString()} monedas**`
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
                            "withdraw_confirm"
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
                            "withdraw_cancel"
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

                //////////////////////////////////////////////////
// EVITAR UNKNOWN INTERACTION
//////////////////////////////////////////////////

await i.deferUpdate();

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
                    "withdraw_cancel"

                ) {

                    collector.stop();

                    return msg.edit({

                        content:
                            "❌ Retiro cancelado.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // CONFIRMAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "withdraw_confirm"

                ) {

                    //////////////////////////////////////////////////
                    // RETIRAR
                    //////////////////////////////////////////////////

                    user.bank -= amount;

                    user.wallet += finalAmount;

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

    globalBank =
        new GlobalBank({

            guildId:
                interaction.guild.id
        });
}

//////////////////////////////////////////////////
// AÑADIR COMISION
//////////////////////////////////////////////////

globalBank.balance += fee;

globalBank.totalCollected += fee;

//////////////////////////////////////////////////

await user.save();

await globalBank.save();

                    //////////////////////////////////////////////////
                    // EMBED SUCCESS
                    //////////////////////////////////////////////////

                    const successEmbed =

                        new EmbedBuilder()

                            .setColor("#00ff99")

                            .setTitle(
                                "💸 Retiro realizado"
                            )

                            .setDescription(

                                `🏦 Has retirado ` +

                                `**${amount.toLocaleString()} monedas**.\n\n` +

                                `💸 Comisión bancaria: ` +

                                `**${fee.toLocaleString()} monedas**\n` +

                                `✅ Recibido: ` +

                                `**${finalAmount.toLocaleString()} monedas**\n\n` +

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