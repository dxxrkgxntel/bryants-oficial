const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
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

        const user =
            interaction.options.getUser(
                "usuario"
            );

        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////

        const userData =

            await getUser(

                interaction.guild.id,
                user.id
            );

        //////////////////////////////////////////////////
        // DINERO
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

        userData.wallet -= amount;

        //////////////////////////////////////////////////

        await userData.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#ff0000")

                .setTitle(
                    "💸 Dinero removido"
                )

                .setDescription(

                    `❌ Se quitaron **${amount.toLocaleString()} monedas** a ${user}.\n\n` +

                    `💵 **Wallet actual:** ${userData.wallet.toLocaleString()}`
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

        await interaction.reply({

            embeds: [embed]
        });
    }
};