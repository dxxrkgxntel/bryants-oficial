const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const verificationSchema =
    require('../../Models/verificationSchema');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('verificacion-setup')

        .setDescription(
            'Crea un sistema de verificación'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        //////////////////////////////////////////////////
        // ROL VERIFICADO
        //////////////////////////////////////////////////

        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription(
                    'Rol que recibirá el usuario'
                )
                .setRequired(true)
        )

        //////////////////////////////////////////////////
        // ROL REMOVER
        //////////////////////////////////////////////////

        .addRoleOption(option =>
            option
                .setName('remove_role')
                .setDescription(
                    'Rol que se removerá'
                )
                .setRequired(true)
        )

        //////////////////////////////////////////////////
        // DESCRIPCION
        //////////////////////////////////////////////////

        .addStringOption(option =>
            option
                .setName('description')
                .setDescription(
                    'Descripción del embed'
                )
                .setRequired(true)
        )

        //////////////////////////////////////////////////
        // CANAL
        //////////////////////////////////////////////////

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription(
                    'Canal donde se enviará'
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
        )

        //////////////////////////////////////////////////
        // THUMBNAIL
        //////////////////////////////////////////////////

        .addAttachmentOption(option =>
            option
                .setName('thumbnail')
                .setDescription(
                    'Thumbnail del embed'
                )
        )

        //////////////////////////////////////////////////
        // IMAGEN
        //////////////////////////////////////////////////

        .addAttachmentOption(option =>
            option
                .setName('image')
                .setDescription(
                    'Imagen grande'
                )
        )

        //////////////////////////////////////////////////
        // FOOTER
        //////////////////////////////////////////////////

        .addStringOption(option =>
            option
                .setName('footer')
                .setDescription(
                    'Texto footer'
                )
        ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // DEFER
            //////////////////////////////////////////////////

            await interaction.deferReply({
                flags: 64
            });

            //////////////////////////////////////////////////
            // VALIDAR ADMIN
            //////////////////////////////////////////////////

            if (
                !interaction.member.permissions.has(
                    PermissionFlagsBits.Administrator
                )
            ) {

                return interaction.editReply({

                    content:
                        '❌ Solo administradores pueden usar este comando.'
                });
            }

            //////////////////////////////////////////////////
            // OPCIONES
            //////////////////////////////////////////////////

            const { options } = interaction;

            const verifiedRole =
                options.getRole('role');

            const removeRole =
                options.getRole('remove_role');

            const description =
                options.getString('description');

            const channel =
                options.getChannel('channel') ||
                interaction.channel;

            const thumbnail =
                options.getAttachment('thumbnail');

            const image =
                options.getAttachment('image');

            const footer =
                options.getString('footer');

            //////////////////////////////////////////////////
            // VALIDAR IMAGENES
            //////////////////////////////////////////////////

            if (
                thumbnail &&
                !thumbnail.contentType?.startsWith('image')
            ) {

                return interaction.editReply({

                    content:
                        '❌ La thumbnail debe ser una imagen válida.'
                });
            }

            //////////////////////////////////////////////////

            if (
                image &&
                !image.contentType?.startsWith('image')
            ) {

                return interaction.editReply({

                    content:
                        '❌ La imagen debe ser válida.'
                });
            }

            //////////////////////////////////////////////////
            // VALIDAR PERMISOS BOT
            //////////////////////////////////////////////////

            const botMember =
                interaction.guild.members.me;

            if (
                !botMember.permissions.has([
                    PermissionFlagsBits.ManageRoles,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.ViewChannel
                ])
            ) {

                return interaction.editReply({

                    content:
                        '❌ Necesito permisos suficientes para configurar el sistema.'
                });
            }

            //////////////////////////////////////////////////
            // JERARQUIA ROLES
            //////////////////////////////////////////////////

            if (
                verifiedRole.position >=
                botMember.roles.highest.position
            ) {

                return interaction.editReply({

                    content:
                        `❌ Mi rol debe estar encima de ${verifiedRole}.`
                });
            }

            //////////////////////////////////////////////////

            if (
                removeRole.position >=
                botMember.roles.highest.position
            ) {

                return interaction.editReply({

                    content:
                        `❌ Mi rol debe estar encima de ${removeRole}.`
                });
            }

            //////////////////////////////////////////////////
            // BOTON
            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(
                                'verifybutton'
                            )

                            .setEmoji('✅')

                            .setLabel(
                                'Verificar'
                            )

                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    );

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor('#8A2BE2')

                    .setTitle(
                        'Sistema de Verificación'
                    )

                    .setDescription( `¡Bienvenido a **${interaction.guild.name}**!\n\n` + `Para acceder al servidor y desbloquear todos los canales, debes completar el proceso de verificación.\n\n` + `> ✅ Obtendrás acceso automáticamente\n` + `> 🔒 Se eliminarán las restricciones iniciales\n` + `> 🚀 Disfruta de toda la comunidad` )

                    .setThumbnail(
                        thumbnail?.url || null
                    )

                    .setImage(
                        image?.url || null
                    )

                    .setFooter({

                        text:
                            footer ||
                            `${interaction.guild.name}`
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////
            // ENVIAR PANEL
            //////////////////////////////////////////////////

            const message =
                await channel.send({

                    embeds: [embed],

                    components: [row]
                });

            //////////////////////////////////////////////////
            // GUARDAR DB
            //////////////////////////////////////////////////

            await verificationSchema.findOneAndUpdate(

                {
                    guildId:
                        interaction.guild.id,

                    channelId:
                        channel.id,

                    messageId:
                        message.id,

                    roleId:
                        verifiedRole.id,

                    removeRoleId:
                        removeRole.id
                },

                {
                    upsert: true,
                    new: true
                }
            );

            //////////////////////////////////////////////////
            // RESPUESTA
            //////////////////////////////////////////////////

            return interaction.editReply({

                content:
                    '✅ Sistema de verificación configurado correctamente.'
            });

        } catch (error) {

            console.log(error);

            if (
                interaction.deferred ||
                interaction.replied
            ) {

                await interaction.editReply({

                    content:
                        '❌ Ocurrió un error al crear el sistema.'
                }).catch(() => {});

            } else {

                await interaction.reply({

                    content:
                        '❌ Ocurrió un error al crear el sistema.',

                    flags: 64
                }).catch(() => {});
            }
        }
    }
};