const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const leaveSchema =
require('../../Models/leaveSchema');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('salida-setup')

        .setDescription(
            'Crea un sistema de salidas del servidor'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        /*
        =========================
        CANAL
        =========================
        */

        .addChannelOption(option =>
            option

                .setName('channel')

                .setDescription(
                    'Canal de salidas'
                )

                .addChannelTypes(
                    ChannelType.GuildText
                )

                .setRequired(true)
        )

        /*
        =========================
        DESCRIPCION
        =========================
        */

        .addStringOption(option =>
            option

                .setName('descripcion')

                .setDescription(
                    'Descripcion del mensaje'
                )
        )

        /*
        =========================
        BANNER URL
        =========================
        */

        .addStringOption(option =>
            option

                .setName('banner')

                .setDescription(
                    'URL del banner superior'
                )
        ),

    async execute(interaction) {

        const { options } = interaction;

        /*
        =========================
        OPCIONES
        =========================
        */

        const channel =
        options.getChannel('channel');

        const description =
        options.getString('descripcion') || ' ';

        const bannerURL =
        options.getString('banner');

        /*
        =========================
        VALIDAR PERMISOS BOT
        =========================
        */

        if (

            !interaction.guild.members.me.permissions.has(
                PermissionFlagsBits.Administrator
            )

        ) {

            return interaction.reply({

                content:
                "❌ No tengo permisos para esto.",

                flags: 64

            });

        }

        /*
        =========================
        VALIDAR CANAL
        =========================
        */

        if (

            !channel ||

            channel.type !==
            ChannelType.GuildText

        ) {

            return interaction.reply({

                content:
                "❌ Debes seleccionar un canal válido.",

                flags: 64

            });

        }

        /*
        =========================
        VALIDAR URL BANNER
        =========================
        */

        if (

            bannerURL &&

            !bannerURL.startsWith('http')

        ) {

            return interaction.reply({

                content:
                '❌ La URL del banner no es válida.',

                flags: 64

            });

        });

        });

        }

        /*
        =========================
        GUARDAR DB
        =========================
        */

        try {

            await leaveSchema.findOneAndUpdate(

                {

                    Guild:
                    interaction.guild.id

                },

                {

                    $set: {

                        Channel:
                        channel.id,

                        MessageDes:
                        description,

                        Banner:
                        bannerURL || null

                    }

                },

                {

                    upsert: true

                }

            );

            /*
            =========================
            RESPUESTA
            =========================
            */

            return interaction.reply({

                content:
                "✅ Sistema de salidas configurado correctamente.",

                flags: 64

            });

        } catch (error) {

            console.log(error);

            return interaction.reply({

                content:
                "❌ Error al guardar la configuración.",

                flags: 64

            });

        }

    }

};