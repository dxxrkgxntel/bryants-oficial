const {

    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits

} = require("discord.js");

const AntiLinksConfig =
    require("../../Models/AntiLinksConfig");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName(
                "antilinks-config"
            )

            .setDescription(
                "Ver configuración AntiLinks"
            )

            //////////////////////////////////////////////////
            // SOLO ADMIN
            //////////////////////////////////////////////////

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // VALIDAR ADMIN
        //////////////////////////////////////////////////

        if (

            !interaction.member.permissions.has(
                PermissionFlagsBits.Administrator
            )

        ) {

            return interaction.reply({

                content:
                    "❌ Solo los administradores pueden usar este comando.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        const data =
            await AntiLinksConfig.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ No hay configuración.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🔗 Configuración AntiLinks"
                )

                .addFields(

                    {

                        name:
                            "Estado",

                        value:
                            data.enabled
                                ? "✅ Activado"
                                : "❌ Desactivado"
                    },

                    {

                        name:
                            "Canales Permitidos",

                        value:

                            data.allowedChannels.length

                                ?

                                data.allowedChannels
                                    .map(id => `<#${id}>`)
                                    .join("\n")

                                :

                                "Ninguno"
                    }
                )

                .setFooter({

                    text:
                        interaction.guild.name
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed],

            flags: 64
        });
    }
};