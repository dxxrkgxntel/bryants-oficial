const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const reportGuildSchema = require('../../Models/reportGuildSchema');
const reportUserSchema = require('../../Models/reportUserSchema');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('reportar')
        .setDescription('Reporta a un usuario del servidor al equipo de moderación')
        .setDMPermission(false)
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario que deseas reportar')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('razon')
                .setDescription('Explica el motivo del reporte')
                .setMinLength(3)
                .setMaxLength(1000)
                .setRequired(true)
        ),

    async execute(interaction, client) {

        const { guild, options, user } = interaction;

        try {

            //////////////////////////////////////////////////
            // CONFIGURACION DEL SISTEMA
            //////////////////////////////////////////////////

            const reportData = await reportGuildSchema.findOne({
                reportGuildId: guild.id
            });

            if (!reportData || !reportData.reportChannelId) {
                return errReply(
                    interaction,
                    '❌ El sistema de reportes no está configurado en este servidor.',
                    true
                );
            }

            //////////////////////////////////////////////////
            // DATOS DEL REPORTE
            //////////////////////////////////////////////////

            const reportedUser = options.getUser('usuario');
            const reason = options.getString('razon').trim();

            if (reportedUser.id === user.id) {
                return errReply(
                    interaction,
                    '❌ No puedes reportarte a ti mismo.',
                    true
                );
            }

            if (reportedUser.bot) {
                return errReply(
                    interaction,
                    '❌ No puedes reportar a un bot con este sistema.',
                    true
                );
            }

            //////////////////////////////////////////////////
            // CANAL CONFIGURADO
            //////////////////////////////////////////////////

            const reportChannel = guild.channels.cache.get(
                reportData.reportChannelId
            );

            if (!reportChannel || !reportChannel.isTextBased()) {
                return errReply(
                    interaction,
                    '❌ El canal de reportes configurado ya no existe o no es válido.',
                    true
                );
            }

            const permissions = reportChannel.permissionsFor(guild.members.me);

            if (
                !permissions ||
                !permissions.has([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks
                ])
            ) {
                return errReply(
                    interaction,
                    '❌ No tengo permisos suficientes en el canal de reportes.',
                    true
                );
            }

            //////////////////////////////////////////////////
            // EMBED
            // IMPORTANTE: reportButtons.js usa los campos 1 y 2
            //////////////////////////////////////////////////

            const reportEmbed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setAuthor({
                    name: `${user.tag} ha realizado un reporte`,
                    iconURL: user.displayAvatarURL({ dynamic: true })
                })
                .setTitle('🚨 Nuevo reporte')
                .setDescription(
                    `**Usuario reportado:** ${reportedUser}\n` +
                    `**ID:** \`${reportedUser.id}\`\n\n` +
                    `**Reportado por:** ${user}\n` +
                    `**ID:** \`${user.id}\``
                )
                .addFields(
                    {
                        name: 'Razón del reporte',
                        value: `\`\`\`${reason}\`\`\``
                    },
                    {
                        name: 'Enviado al MD',
                        value: 'Pendiente',
                        inline: true
                    },
                    {
                        name: 'Usuario Sancionado',
                        value: 'Pendiente',
                        inline: true
                    }
                )
                .setFooter({
                    text: guild.name,
                    iconURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
                })
                .setTimestamp();

            //////////////////////////////////////////////////
            // BOTONES DE MODERACION
            //////////////////////////////////////////////////

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('reportban')
                    .setLabel('Banear')
                    .setEmoji('🔨')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('reportkick')
                    .setLabel('Expulsar')
                    .setEmoji('👢')
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId('reportto')
                    .setLabel('Timeout 15m')
                    .setEmoji('⏱️')
                    .setStyle(ButtonStyle.Secondary)
            );

            //////////////////////////////////////////////////
            // ENVIAR REPORTE
            //////////////////////////////////////////////////

            const reportMessage = await reportChannel.send({
                embeds: [reportEmbed],
                components: [buttons]
            });

            //////////////////////////////////////////////////
            // GUARDAR RELACION MENSAJE -> USUARIO
            //////////////////////////////////////////////////

            await reportUserSchema.create({
                reportGuildId: guild.id,
                reportUserId: reportedUser.id,
                reportMessageId: reportMessage.id
            });

            //////////////////////////////////////////////////
            // CONFIRMACION PRIVADA
            //////////////////////////////////////////////////

            return correReply(
                interaction,
                '✅ Tu reporte fue enviado correctamente al equipo de moderación.',
                true
            );

        } catch (error) {

            console.log(error);

            return errReply(
                interaction,
                '❌ Ocurrió un error al enviar el reporte.',
                true
            );
        }
    }
};
