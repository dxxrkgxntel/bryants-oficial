const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const logsSchema = require("../../Models/logsSchema");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("logs-setup")
        .setDescription("Configura el canal de logs")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addChannelOption(option =>
            option
                .setName("canal")
                .setDescription("Canal de logs")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {

        //////////////////////////////////////////////////
        // PERMISOS
        //////////////////////////////////////////////////

        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {

            return interaction.reply({

                content:
                    "❌ Solo administradores pueden usar este comando.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // OPCIONES
        //////////////////////////////////////////////////

        const channel =
            interaction.options.getChannel("canal");

        //////////////////////////////////////////////////
        // BUSCAR DATA
        //////////////////////////////////////////////////

        let data =
            await logsSchema.findOne({

                Guild: interaction.guild.id
            });

        //////////////////////////////////////////////////
        // CREAR O ACTUALIZAR
        //////////////////////////////////////////////////

        if (!data) {

            data =
                await logsSchema.create({

                    Guild: interaction.guild.id,
                    Channel: channel.id
                });

        } else {

            data.Channel = channel.id;

            await data.save();
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle("📜 Sistema de Logs Configurado")

                .setDescription(
                    `> Los logs del servidor ahora se enviarán en ${channel}\n\n` +
                    `💜 El sistema registrará eventos importantes\n` +
                    `como moderación, mensajes, canales y más.`
                )

                .setThumbnail(
                    interaction.guild.iconURL({
                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        `${interaction.guild.name} • Sistema de Logs`
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // RESPUESTA
        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed],

            flags: 64
        });
    }
};