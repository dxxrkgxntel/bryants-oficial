const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const welcomeSchema = require('../../Models/welcomeSchema');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('bienvenida-setup')

        .setDescription('Crea un sistema de bienvenidas al servidor')

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Canal de bienvenida')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('color')
                .setDescription('Color del embed')
                .addChoices(
                    { name: 'Rojo', value: '#FF0000' },
                    { name: 'Blanco', value: '#FFFFFF' },
                    { name: 'Negro', value: '#000000' },
                    { name: 'Morado', value: '#8A2BE2' }
                )
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName('descripcion')
                .setDescription('Descripción del mensaje')
        )

        .addAttachmentOption(option =>
            option
                .setName('image')
                .setDescription('Imagen principal')
        )

        .addAttachmentOption(option =>
            option
                .setName('thumbnail')
                .setDescription('Thumbnail del embed')
        ),

    async execute(interaction) {

        try {

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
                        '❌ Solo administradores pueden usar este comando.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // OPCIONES
            //////////////////////////////////////////////////

            const { options } = interaction;

            const channel =
                options.getChannel('channel');

            const color =
                options.getString('color');

            const description =
                options.getString('descripcion') ||
                'Pasala muy bien';

            const image =
                options.getAttachment('image');

            const thumbnail =
                options.getAttachment('thumbnail');

            //////////////////////////////////////////////////
            // VALIDAR CANAL
            //////////////////////////////////////////////////

            if (!channel || channel.type !== ChannelType.GuildText) {

                return interaction.reply({

                    content:
                        '❌ Debes seleccionar un canal de texto válido.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // VALIDAR IMAGENES
            //////////////////////////////////////////////////

            if (
                image &&
                !image.contentType?.startsWith('image/')
            ) {

                return interaction.reply({

                    content:
                        '❌ La imagen principal no es válida.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////

            if (
                thumbnail &&
                !thumbnail.contentType?.startsWith('image/')
            ) {

                return interaction.reply({

                    content:
                        '❌ La thumbnail no es válida.',

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // URLs
            //////////////////////////////////////////////////

            const imageURL =
                image?.url || null;

            const thumbnailURL =
                thumbnail?.url || null;

            //////////////////////////////////////////////////
            // GUARDAR DB
            //////////////////////////////////////////////////

            await welcomeSchema.findOneAndUpdate(

                {
                    Guild: interaction.guild.id
                },

                {
                    $set: {

                        Channel:
                            channel.id,

                        MessageDes:
                            description,

                        ImagenDesc:
                            imageURL,

                        Thumbnail:
                            thumbnailURL,

                        Color:
                            color
                    }
                },

                {
                    upsert: true,
                    new: true
                }
            );

            //////////////////////////////////////////////////
            // RESPUESTA
            //////////////////////////////////////////////////

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