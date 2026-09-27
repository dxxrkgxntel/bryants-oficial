const {
    SlashCommandBuilder,
    ChannelType,
    ChatInputCommandInteraction,
    PermissionFlagsBits
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const reportSchema = require('../../Models/reportGuildSchema');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('reporte-setup')
        .setDescription('Crea el sistema de reportes para tu servidor')

        // 🔒 SOLO ADMIN
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .setDMPermission(false)

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Elige el canal para los logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {

        // 🔒 SEGURIDAD EXTRA
        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {
            return interaction.reply({
                content: '❌ No tienes permisos para usar este comando.',
                flags: 64
            });
        }

        const { options, guild } = interaction;

        const channelLogs =
            options.getChannel('channel');

        try {

            // 🔒 VALIDAR QUE EL CANAL EXISTA
            const channel =
                guild.channels.cache.get(channelLogs.id);

            if (!channel) {
                return errReply(
                    interaction,
                    '❌ El canal seleccionado no existe.',
                    true
                );
            }

            // 🔒 VALIDAR PERMISOS DEL BOT
            const permissions =
                channel.permissionsFor(guild.members.me);

            if (
                !permissions.has([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks
                ])
            ) {
                return errReply(
                    interaction,
                    '❌ No tengo permisos suficientes en ese canal.',
                    true
                );
            }

            //////////////////////////////////////////////////
            // BUSCAR CONFIG
            //////////////////////////////////////////////////

            const reportData =
                await reportSchema.findOne({
                    reportGuildId: guild.id
                });

            //////////////////////////////////////////////////
            // CREAR NUEVO
            //////////////////////////////////////////////////

            if (!reportData) {

                await reportSchema.create({

                    reportChannelId:
                        channelLogs.id,

                    reportGuildId:
                        guild.id
                });

                return correReply(
                    interaction,
                    '✅ Sistema de reportes configurado correctamente.',
                    true
                );
            }

            //////////////////////////////////////////////////
            // ACTUALIZAR
            //////////////////////////////////////////////////

            await reportSchema.findOneAndUpdate(
                { reportGuildId: guild.id },
                {
                    reportChannelId:
                        channelLogs.id
                }
            );

            return correReply(
                interaction,
                '✅ Sistema de reportes actualizado correctamente.',
                true
            );

        } catch (error) {

            console.log(error);

            return errReply(
                interaction,
                '❌ Ocurrió un error al configurar el sistema de reportes.',
                true
            );
        }
    }
};