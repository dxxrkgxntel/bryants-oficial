const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

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
        // TRANSFERIR
        //////////////////////////////////////////////////

        sender.wallet -= amount;

        receiver.wallet += amount;

        //////////////////////////////////////////////////

        await sender.save();

        await receiver.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🔁 Transferencia realizada"
                )

                .setDescription(

                    `💸 Has transferido **${amount.toLocaleString()} monedas** a ${target}.\n\n` +

                    `💵 **Tu wallet actual:** ${sender.wallet.toLocaleString()}`
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

        await interaction.reply({

            embeds: [embed]
        });
    }
};