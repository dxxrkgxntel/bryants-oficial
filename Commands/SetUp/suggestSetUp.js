const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const suggestSchema =
    require('../../Models/suggestSchema');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('sugerencia-setup')

        .setDescription(
            'Crea el sistema de sugerencias'
        )

        // 🔒 SOLO ADMIN
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .setDMPermission(false)

        .addChannelOption(option =>

            option
                .setName('channel')

                .setDescription(
                    'Elige el canal de sugerencias'
                )

                .addChannelTypes(
                    ChannelType.GuildText
                )

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
                    '❌ No tienes permisos para usar este comando.',

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // OPCIONES
        //////////////////////////////////////////////////

        const { options, guild } = interaction;

        const suggestChannel =
            options.getChannel('channel');

        //////////////////////////////////////////////////
        // VALIDAR CANAL
        //////////////////////////////////////////////////

        const channel =
            guild.channels.cache.get(
                suggestChannel.id
            );

        if (!channel) {

            return interaction.reply({

                content:
                    '❌ El canal seleccionado no existe.',

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // VALIDAR PERMISOS BOT
        //////////////////////////////////////////////////

        const permissions =
            channel.permissionsFor(
                guild.members.me
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
                    '❌ No tengo permisos suficientes en ese canal.',

                flags: 64
            });
        }

        try {

            //////////////////////////////////////////////////
            // BUSCAR DATA
            //////////////////////////////////////////////////

            const data =
                await suggestSchema.findOne({

                    guildSuggest:
                        guild.id
                });

            //////////////////////////////////////////////////
            // CREAR
            //////////////////////////////////////////////////

            if (!data) {

                await suggestSchema.create({

                    guildSuggest:
                        guild.id,

                    guildChannel:
                        suggestChannel.id,

                    Enabled: true
                });

                return interaction.reply({

                    content:
                        '✅ Sistema de sugerencias creado correctamente.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // ACTUALIZAR
            //////////////////////////////////////////////////

            await suggestSchema.findOneAndUpdate(

                {
                    guildSuggest:
                        guild.id
                },

                {
                    guildChannel:
                        suggestChannel.id,

                    Enabled: true
                }
            );

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    '✅ Sistema de sugerencias actualizado correctamente.',

                flags: 64
            });

        } catch (error) {

            console.log(error);

            return interaction.reply({

                content:
                    '❌ Ocurrió un error al configurar el sistema de sugerencias.',

                flags: 64
            });
        }
    }
};