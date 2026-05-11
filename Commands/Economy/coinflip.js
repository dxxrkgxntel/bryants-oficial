const {

    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle

} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("coinflip")

            .setDescription(
                "Desafía a un usuario a una apuesta"
            )

            .addUserOption(option =>

                option

                    .setName("usuario")

                    .setDescription(
                        "Usuario a desafiar"
                    )

                    .setRequired(true)
            )

            .addIntegerOption(option =>

                option

                    .setName("cantidad")

                    .setDescription(
                        "Cantidad a apostar"
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
        // VALIDACIONES
        //////////////////////////////////////////////////

        if (

            target.bot ||

            target.id === interaction.user.id
        ) {

            return interaction.reply({

                content:
                    "❌ Usuario inválido.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // USERS
        //////////////////////////////////////////////////

        const authorData =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    interaction.user.id
            });

        //////////////////////////////////////////////////

        const targetData =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    target.id
            });

        //////////////////////////////////////////////////

        if (

            !authorData ||

            authorData.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        if (

            !targetData ||

            targetData.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ Ese usuario no tiene suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle("🪙 Desafío Coinflip")

                .setDescription(

                    `🎰 ${interaction.user} desafió a ${target}\n\n` +

                    `💰 Apuesta: **${amount.toLocaleString()} monedas**\n\n` +

                    `🪙 El ganador se llevará todo el dinero.`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Bryant's Casino"
                });

        //////////////////////////////////////////////////
        // BUTTON
        //////////////////////////////////////////////////

        const row =

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(

                            `coinflip_${interaction.user.id}_${target.id}_${amount}`
                        )

                        .setLabel(
                            "Aceptar apuesta"
                        )

                        .setEmoji("🪙")

                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed],

            components: [row]
        });
    }
};