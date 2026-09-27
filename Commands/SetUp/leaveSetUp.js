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
        IMAGE URL
        =========================
        */

        .addStringOption(option =>
            option

                .setName('image')

                .setDescription(
                    'URL de la imagen del embed'
                )
        )

        /*
        =========================
        THUMBNAIL URL
        =========================
        */

        .addStringOption(option =>
            option

                .setName('thumbnail')

                .setDescription(
                    'URL de la thumbnail'
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

        const imageURL =
        options.getString('image');

        const thumbnailURL =
        options.getString('thumbnail');

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
        VALIDAR URL IMAGE
        =========================
        */

        if (

            imageURL &&

            !imageURL.startsWith('http')

        ) {

            return interaction.reply({

                content:
                '❌ La URL de la imagen no es válida.',

                flags: 64

            });

        }

        /*
        =========================
        VALIDAR URL THUMBNAIL
        =========================
        */

        if (

            thumbnailURL &&

            !thumbnailURL.startsWith('http')

        ) {

            return interaction.reply({

                content:
                '❌ La URL de la thumbnail no es válida.',

                flags: 64

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

                        ImagenDesc:
                        imageURL || null,

                        Thumbnail:
                        thumbnailURL || null

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