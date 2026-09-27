const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const welcomeSchema =
require('../../Models/welcomeSchema');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('bienvenida-setup')

        .setDescription(
            'Crea un sistema de bienvenidas al servidor'
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
                    'Canal de bienvenida'
                )

                .addChannelTypes(
                    ChannelType.GuildText
                )

                .setRequired(true)
        )

        /*
        =========================
        COLOR
        =========================
        */

        .addStringOption(option =>
            option

                .setName('color')

                .setDescription(
                    'Color del embed'
                )

                .addChoices(

                    {
                        name: 'Rojo',
                        value: '#FF0000'
                    },

                    {
                        name: 'Blanco',
                        value: '#FFFFFF'
                    },

                    {
                        name: 'Negro',
                        value: '#000000'
                    },

                    {
                        name: 'Morado',
                        value: '#8A2BE2'
                    }

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
                    'Descripción del mensaje'
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
                    'URL de la imagen principal'
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

        try {

            /*
            =========================
            VALIDAR ADMIN
            =========================
            */

            if (

                !interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )

            ) {

                return interaction.reply({

                    content:
                    '❌ Solo administradores pueden usar este comando.',

                    flags: 64

                });

            }

            /*
            =========================
            OPCIONES
            =========================
            */

            const { options } = interaction;

            const channel =
            options.getChannel('channel');

            const color =
            options.getString('color');

            const description =
            options.getString('descripcion') ||
            'Pasala muy bien';

            const imageURL =
            options.getString('image');

            const thumbnailURL =
            options.getString('thumbnail');

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
                    '❌ Debes seleccionar un canal de texto válido.',

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

            await welcomeSchema.findOneAndUpdate(

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
                        thumbnailURL || null,

                        Color:
                        color

                    }

                },

                {

                    upsert: true,
                    new: true

                }

            );

            /*
            =========================
            RESPUESTA
            =========================
            */

            return interaction.reply({

                content:
                '✅ Sistema de bienvenidas configurado correctamente.',

                flags: 64

            });

        } catch (error) {

            console.log(error);

            return interaction.reply({

                content:
                '❌ Ocurrió un error al configurar el sistema de bienvenidas.',

                flags: 64

            });

        }

    }

};