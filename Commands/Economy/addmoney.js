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

            .setName("añadir-dinero")

            .setDescription(
                "Añade dinero a un usuario"
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

        userData.wallet += amount;

        //////////////////////////////////////////////////

        await userData.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "💰 Dinero añadido"
                )

                .setDescription(

                    `✅ Se añadieron **${amount.toLocaleString()} monedas** a ${user}.\n\n` +

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