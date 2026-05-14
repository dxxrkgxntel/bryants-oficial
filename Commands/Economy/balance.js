const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const applyBankBonus =
    require("../../utils/applyBankBonus");

const updateDebt =
    require("../../utils/updateDebt");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("balance")

            .setDescription(
                "Muestra tu balance"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const target =
            interaction.user;

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const userData =

            await getUser(

                interaction.guild.id,
                target.id
            );

        //////////////////////////////////////////////////
        // BONUS BANCARIO
        //////////////////////////////////////////////////

        const bonus =

            await applyBankBonus(
                userData
            );

        //////////////////////////////////////////////////

        await userData.save();

        //////////////////////////////////////////////////
        // ACTUALIZAR DEUDA
        //////////////////////////////////////////////////

        const addedDebt =
            await updateDebt(
                userData
            );

        //////////////////////////////////////////////////
        // TOTAL
        //////////////////////////////////////////////////

        const total =

            userData.wallet +
            userData.bank;

        //////////////////////////////////////////////////
        // MEMBER
        //////////////////////////////////////////////////

        const member =
            await interaction.guild.members

                .fetch(target.id)

                .catch(() => null);

        //////////////////////////////////////////////////
        // DISPLAY NAME
        //////////////////////////////////////////////////

        const displayName =

            member?.displayName ||

            target.username;

        //////////////////////////////////////////////////
        // ESTADO FINANCIERO
        //////////////////////////////////////////////////

        let financialStatus =
            "🟢 Estable";

        //////////////////////////////////////////////////

        if (userData.debt > 0) {

            financialStatus =
                "🔴 Endeudado";
        }

        //////////////////////////////////////////////////

        if (userData.debt >= 100000) {

            financialStatus =
                "⚠️ Deuda elevada";
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    `💰 Balance de ${displayName}`
                )

                .addFields(

                    {
                        name: "💵 Wallet",

                        value:
                            `${userData.wallet.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "🏦 Banco",

                        value:
                            `${userData.bank.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "📊 Total",

                        value:
                            `${total.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "📉 Deuda",

                        value:
                            `${userData.debt.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "🏛️ Estado financiero",

                        value:
                            financialStatus,

                        inline: true
                    }
                );

        //////////////////////////////////////////////////
        // INTERESES ACUMULADOS
        //////////////////////////////////////////////////

        if (addedDebt > 0) {

            embed.addFields({

                name:
                    "📈 Intereses acumulados",

                value:
                    `+${addedDebt.toLocaleString()} monedas añadidas a tu deuda`,

                inline: false
            });
        }

        //////////////////////////////////////////////////
        // BONUS BANCARIO
        //////////////////////////////////////////////////

        if (bonus > 0) {

            embed.addFields({

                name:
                    "🏦 Bonus Bancario",

                value:
                    `+${bonus.toLocaleString()} monedas generadas`,

                inline: false
            });
        }

        //////////////////////////////////////////////////
        // THUMBNAIL
        //////////////////////////////////////////////////

        embed.setThumbnail(

            target.displayAvatarURL({

                dynamic: true,
                size: 1024
            })
        );

        //////////////////////////////////////////////////
        // IMAGE
        //////////////////////////////////////////////////

        embed.setImage(
            "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
        );

        //////////////////////////////////////////////////

        embed.setFooter({

            text:
                interaction.guild.name
        });

        //////////////////////////////////////////////////

        embed.setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};