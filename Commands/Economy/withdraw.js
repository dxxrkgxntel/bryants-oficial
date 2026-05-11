const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const bankConfig =
    require("../../Config/bankConfig");

const EconomyUser =
    require("../../Models/EconomyUser");

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

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////

        const user =

            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // DINERO
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

const fee = Math.floor(

    amount *
    bankConfig.withdrawFee
);

//////////////////////////////////////////////////

const finalAmount =
    amount - fee;

//////////////////////////////////////////////////
// RESTAR BANCO
//////////////////////////////////////////////////

user.bank -= amount;

//////////////////////////////////////////////////
// DAR DINERO
//////////////////////////////////////////////////

user.wallet += finalAmount;

//////////////////////////////////////////////////
// OWNER ACCOUNT
//////////////////////////////////////////////////

let ownerData =
    await EconomyUser.findOne({

        guildId:
            interaction.guild.id,

        userId:
            bankConfig.ownerId
    });

//////////////////////////////////////////////////

if (!ownerData) {

    ownerData =
        new EconomyUser({

            guildId:
                interaction.guild.id,

            userId:
                bankConfig.ownerId,

            wallet: 0,

            bank: 0
        });
}

//////////////////////////////////////////////////
// DAR COMISION
//////////////////////////////////////////////////

ownerData.wallet += fee;

//////////////////////////////////////////////////

await ownerData.save();

        //////////////////////////////////////////////////

        await user.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "💸 Retiro realizado"
                )

                .setDescription(

                    `🏦 Has retirado **${amount.toLocaleString()} monedas** de tu banco.\n\n` +

`💸 Comisión bancaria: **${fee.toLocaleString()} monedas**\n` +

`✅ Recibido: **${finalAmount.toLocaleString()} monedas**\n\n` +

`💵 **Wallet:** ${user.wallet.toLocaleString()}\n` +

`🏦 **Banco:** ${user.bank.toLocaleString()}`
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

        await interaction.reply({

            embeds: [embed]
        });
    }
};