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

        // 🔒 SOLO ADMINS
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .setDMPermission(false)

        .addChannelOption(option =>
            option
                .setName("canal")
                .setDescription("Canal de logs")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {

        //////////////////////////////////////////////////
        // SEGURIDAD EXTRA
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
        // VALIDAR CANAL
        //////////////////////////////////////////////////

        const realChannel =
            interaction.guild.channels.cache.get(
                channel.id
            );

        if (!realChannel) {

            return interaction.reply({

                content:
                    "❌ El canal seleccionado no existe.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // VALIDAR PERMISOS DEL BOT
        //////////////////////////////////////////////////

        const permissions =
            realChannel.permissionsFor(
                interaction.guild.members.me
            );

        if (
            !permissions.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ])
        ) {

            return interaction.reply({

                content:
                    "❌ No tengo permisos suficientes en ese canal.",

                flags: 64
            });
        }

        try {

            //////////////////////////////////////////////////
            // BUSCAR DATA
            //////////////////////////////////////////////////

            let data =
                await logsSchema.findOne({

                    Guild:
                        interaction.guild.id
                });

            //////////////////////////////////////////////////
            // CREAR
            //////////////////////////////////////////////////

            if (!data) {

                data =
                    await logsSchema.create({

                        Guild:
                            interaction.guild.id,

                        Channel:
                            channel.id
                    });

            } else {

                //////////////////////////////////////////////////
                // ACTUALIZAR
                //////////////////////////////////////////////////

                data.Channel =
                    channel.id;

                await data.save();
            }

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📜 Sistema de Logs Configurado"
                    )

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

        } catch (error) {

            console.log(error);

            return interaction.reply({

                content:
                    "❌ Ocurrió un error al configurar el sistema de logs.",

                flags: 64
            });
        }
    }
};