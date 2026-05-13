const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const BirthdayConfig =
    require("../../Models/BirthdayConfig");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "birthday-role"
            )

            .setDescription(
                "Configurar rol de cumpleaños"
            )

            //////////////////////////////////////////////////
            // ADMIN
            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            .addRoleOption(option =>

                option

                    .setName("rol")

                    .setDescription(
                        "Rol que se dará en cumpleaños"
                    )

                    .setRequired(true)
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
        // FIND OR CREATE
        //////////////////////////////////////////////////

        let data =
            await BirthdayConfig.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            data =
                new BirthdayConfig({

                    guildId:
                        interaction.guild.id
                });
        }

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        data.roleId =
            role.id;

        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎂 Rol configurado"
                )

                .setDescription(

                    `✅ El rol ${role} será entregado automáticamente en cumpleaños.`
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