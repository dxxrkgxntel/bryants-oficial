const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const applyBankBonus =
    require("../../utils/applyBankBonus");

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

        const target = interaction.user;

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const userData =

            await getUser(

                interaction.guild.id,
                target.id
            );

        //////////////////////////////////////////////////
        // BONUS
        //////////////////////////////////////////////////

        const bonus =

            await applyBankBonus(
                userData
            );

        //////////////////////////////////////////////////

        await userData.save();

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
                    }
                )

                //////////////////////////////////////////////////
                // BONUS SOLO SI EXISTE
                //////////////////////////////////////////////////

                .setThumbnail(

                    target.displayAvatarURL({

                        dynamic: true,
                        size: 1024
                    })
                )

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BONUS FIELD
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

        await interaction.reply({

            embeds: [embed]
        });
    }
};