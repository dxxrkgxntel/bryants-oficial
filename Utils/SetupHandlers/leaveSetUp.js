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

        .addStringOption(option => option
            .setName('titulo')
            .setDescription('Título del mensaje de salida')
            .setMaxLength(256)
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
                .setMaxLength(4000)
        )

        .addStringOption(option => option
            .setName('color')
            .setDescription('Color hexadecimal, por ejemplo #8A2BE2')
            .setMaxLength(7)
        )

        .addStringOption(option => option
            .setName('thumbnail')
            .setDescription('URL de miniatura')
            .setMaxLength(300)
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

        const title = options.getString('titulo') || '';
        const description = options.getString('descripcion') || '';
        const color = options.getString('color') || '';

        const bannerURL =
        options.getString('banner');
        const thumbnailURL = options.getString('thumbnail');

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

        if ([bannerURL, thumbnailURL].some(url => url && !/^https?:\/\//i.test(url))) {

            return interaction.reply({

                content:
                '❌ La URL del banner no es válida.',

                flags: 64

            });

        }

        if (color && !/^#[\da-f]{6}$/i.test(color)) {
            return interaction.reply({ content: 'El color debe tener formato hexadecimal #RRGGBB.', flags: 64 });
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

                        Title:
                        title,

                        MessageDes:
                        description,

                        Banner:
                        bannerURL || null,

                        Thumbnail:
                        thumbnailURL || null,

                        Color:
                        color

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
