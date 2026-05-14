const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const BankDonorRole =
    require("../../Models/BankDonorRoles");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("bank-role-add")

            .setDescription(
                "Añade un rol de donador del banco"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            .addRoleOption(option =>

                option

                    .setName("rol")

                    .setDescription(
                        "Rol a desbloquear"
                    )

                    .setRequired(true)
            )

            .addIntegerOption(option =>

                option

                    .setName("cantidad")

                    .setDescription(
                        "Cantidad requerida"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // ROLE
        //////////////////////////////////////////////////

        const role =
            interaction.options.getRole(
                "rol"
            );

        //////////////////////////////////////////////////
        // AMOUNT
        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

        //////////////////////////////////////////////////
        // EXISTE
        //////////////////////////////////////////////////

        const exists =
            await BankDonorRole.findOne({

                guildId:
                    interaction.guild.id,

                roleId:
                    role.id
            });

        //////////////////////////////////////////////////

        if (exists) {

            return interaction.reply({

                content:
                    "❌ Ese rol ya está configurado como rol de donador.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // CREAR
        //////////////////////////////////////////////////

        await BankDonorRole.create({

            guildId:
                interaction.guild.id,

            roleId:
                role.id,

            requiredAmount:
                amount
        });

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "🏦 Rol de donador añadido"
                )

                .setDescription(

                    `🎭 Rol: ${role}\n\n` +

                    `💰 Donación requerida:\n` +

                    `**${amount.toLocaleString()} monedas**`
                )

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};