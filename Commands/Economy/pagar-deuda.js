const {
    SlashCommandBuilder,
    EmbedBuilder
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

            .setName("pagar-deuda")

            .setDescription(
                "Paga tu deuda con el banco"
            )

            .addIntegerOption(option =>

                option

                    .setName("cantidad")

                    .setDescription(
                        "Cantidad a pagar"
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

        const userData =

            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // ACTUALIZAR DEUDA
        //////////////////////////////////////////////////

        const addedDebt =
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
        // NO DEUDA
        //////////////////////////////////////////////////

        if (
            userData.debt <= 0
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes ninguna deuda activa.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // DINERO TOTAL
        //////////////////////////////////////////////////

        const totalMoney =

            userData.wallet +
            userData.bank;

        //////////////////////////////////////////////////
        // SIN DINERO
        //////////////////////////////////////////////////

        if (
            totalMoney < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero para pagar esa cantidad.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // NO PAGAR MÁS DE LA DEUDA
        //////////////////////////////////////////////////

        if (
            amount > userData.debt
        ) {

            return interaction.reply({

                content:
                    `❌ Tu deuda actual es de ${userData.debt.toLocaleString()} monedas.`,

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // RESTAR WALLET PRIMERO
        //////////////////////////////////////////////////

        if (
            userData.wallet >= amount
        ) {

            userData.wallet -= amount;

        } else {

            //////////////////////////////////////////////////
            // RESTANTE
            //////////////////////////////////////////////////

            const remaining =

                amount -
                userData.wallet;

            //////////////////////////////////////////////////

            userData.wallet = 0;

            userData.bank -= remaining;
        }

        //////////////////////////////////////////////////
        // REDUCIR DEUDA
        //////////////////////////////////////////////////

        userData.debt -= amount;

        //////////////////////////////////////////////////
        // BANCO GLOBAL
        //////////////////////////////////////////////////

        globalBank.balance += amount;

        //////////////////////////////////////////////////
        // SI TERMINA DE PAGAR
        //////////////////////////////////////////////////

        if (
            userData.debt <= 0
        ) {

            userData.debt = 0;

            userData.loanTaken = false;

            userData.loanDate = null;
        }

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await userData.save();

        await globalBank.save();

        //////////////////////////////////////////////////
        // ESTADO
        //////////////////////////////////////////////////

        let debtStatus =
            "🟢 Sin deuda";

        //////////////////////////////////////////////////

        if (userData.debt > 0) {

            debtStatus =
                "🔴 Aún tienes deuda pendiente";
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "💳 Pago de deuda realizado"
                )

                .setDescription(

                    `💸 Has pagado ` +

                    `**${amount.toLocaleString()} monedas** de tu deuda.\n\n` +

                    `📉 Deuda restante: ` +

                    `**${userData.debt.toLocaleString()} monedas**\n\n` +

                    `🏛️ Estado financiero:\n` +

                    `${debtStatus}\n\n` +

                    `💵 Wallet: ` +

                    `**${userData.wallet.toLocaleString()}**\n` +

                    `🏦 Banco: ` +

                    `**${userData.bank.toLocaleString()}**`
                )

                //////////////////////////////////////////////////
                // INTERESES
                //////////////////////////////////////////////////

                .addFields({

                    name:
                        "📈 Intereses acumulados",

                    value:
                        addedDebt > 0

                            ? `+${addedDebt.toLocaleString()} monedas añadidas antes del pago`

                            : "No se generaron nuevos intereses",

                    inline: false
                })

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

        await interaction.reply({

            embeds: [embed]
        });
    }
};