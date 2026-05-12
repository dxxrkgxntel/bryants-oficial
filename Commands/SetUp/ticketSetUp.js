const {
    PermissionFlagsBits,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ChannelType,
    EmbedBuilder
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const ticketSchema = require('../../Models/ticketGuildSchema');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('ticket-setup')

        .setDescription(
            'Crea un sistema de tickets para tu servidor'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Canal donde irá el panel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName('channellogs')
                .setDescription('Canal de logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName('channelsupport')
                .setDescription('Categoría tickets soporte')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )

        .addChannelOption(option =>
            option
                .setName('channelbuy')
                .setDescription('Categoría tickets compra')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )

        .addRoleOption(option =>
            option
                .setName('handlers')
                .setDescription('Rol del staff')
                .setRequired(true)
        )

        .addRoleOption(option =>
            option
                .setName('everyone')
                .setDescription('Rol @everyone')
                .setRequired(true)
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
            // OPCIONES
            //////////////////////////////////////////////////

            const { options } = interaction;

            const channelDisplay =
                options.getChannel('channel');

            const channelLogs =
                options.getChannel('channellogs');

            const categorySupport =
                options.getChannel('channelsupport');

            const categoryBuy =
                options.getChannel('channelbuy');

            const everyoneRol =
                options.getRole('everyone');

            const handlerRol =
                options.getRole('handlers');

            //////////////////////////////////////////////////
            // VALIDAR ROL EVERYONE
            //////////////////////////////////////////////////

            if (
                everyoneRol.id !==
                interaction.guild.roles.everyone.id
            ) {

                return interaction.editReply({

                    content:
                        '❌ Debes seleccionar el rol @everyone correcto.'
                });
            }

            //////////////////////////////////////////////////
            // VALIDAR PERMISOS BOT
            //////////////////////////////////////////////////

            const botMember =
                interaction.guild.members.me;

            if (
                !botMember.permissions.has([
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.EmbedLinks
                ])
            ) {

                return interaction.editReply({

                    content:
                        '❌ Necesito permisos suficientes para configurar el sistema de tickets.'
                });
            }

            //////////////////////////////////////////////////
            // MENU
            //////////////////////////////////////////////////

            const menu =
                new StringSelectMenuBuilder()

                    .setCustomId('tickets')

                    .setPlaceholder(
                        '🎫 Elige una opción'
                    )

                    .addOptions(

                        new StringSelectMenuOptionBuilder()

                            .setLabel('SOPORTE')

                            .setDescription(
                                'Abrir ticket de soporte'
                            )

                            .setEmoji('🛠️')

                            .setValue('soporte'),

                        new StringSelectMenuOptionBuilder()

                            .setLabel('COMPRA')

                            .setDescription(
                                'Abrir ticket de compra'
                            )

                            .setEmoji('💰')

                            .setValue('compra')
                    );

            //////////////////////////////////////////////////
            // ROW
            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(menu);

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor('#8A2BE2')

                    .setTitle(
                        `🎫 Tickets ${interaction.guild.name}`
                    )

                    .setDescription(

                        `Bienvenido al sistema de tickets.\n\n` +

                        `📌 Selecciona una categoría del menú para abrir un ticket.\n\n` +

                        `🛠️ Soporte\n` +
                        `💰 Compras`
                    )

                    .setThumbnail(
                        interaction.guild.iconURL({
                            dynamic: true
                        })
                    )

                    .setFooter({

                        text:
                            `${interaction.guild.name} • Sistema de Tickets`
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////
            // ENVIAR PANEL
            //////////////////////////////////////////////////

            await channelDisplay.send({

                embeds: [embed],

                components: [row]
            });

            //////////////////////////////////////////////////
            // GUARDAR DB
            //////////////////////////////////////////////////

            await ticketSchema.findOneAndUpdate(

                {
                    guildId:
                        interaction.guild.id
                },

                {
                    guildId:
                        interaction.guild.id,

                    channelId:
                        channelDisplay.id,

                    categorySoporte:
                        categorySupport.id,

                    categoryBuy:
                        categoryBuy.id,

                    channelLogs:
                        channelLogs.id,

                    handlerRol:
                        handlerRol.id,

                    everyoneRol:
                        everyoneRol.id
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
                    '✅ Sistema de tickets configurado correctamente.'
            });

        } catch (error) {

            console.log(error);

            if (
                interaction.deferred ||
                interaction.replied
            ) {

                await interaction.editReply({

                    content:
                        '❌ Ocurrió un error al configurar el sistema.'
                }).catch(() => {});

            } else {

                await interaction.reply({

                    content:
                        '❌ Ocurrió un error al configurar el sistema.',

                    flags: 64
                }).catch(() => {});
            }
        }
    }
};