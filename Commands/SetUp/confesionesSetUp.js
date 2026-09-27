const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ChatInputCommandInteraction } = require('discord.js')

const errReply = require('../../Functions/interactionErrorReply')
const correReply = require('../../Functions/interactionReply')

const confesionesSchema = require('../../Models/confesionesSetUp')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confesiones-setup')
        .setDescription('Crea un sistema de confesiones')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Elige el canal donde se mostraran las confesiones')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {

        const { options, guild } = interaction;

        const channel = options.getChannel('channel');

        try {

            // 🔒 Verificar permisos del bot
            const permissions = channel.permissionsFor(guild.members.me);

            if (
                !permissions.has('ViewChannel') ||
                !permissions.has('SendMessages') ||
                !permissions.has('EmbedLinks')
            ) {
                return errReply(
                    interaction,
                    '❌ No tengo permisos suficientes en ese canal.',
                    true
                );
            }

            const confesionesData = await confesionesSchema.findOne({
                guildId: guild.id
            });

            // ✅ CREAR
            if (!confesionesData) {

                await confesionesSchema.create({
                    guildId: guild.id,
                    channelId: channel.id
                });

                return correReply(
                    interaction,
                    `✅ Sistema de confesiones configurado en ${channel}`,
                    true
                );
            }

            // ✅ ACTUALIZAR
            await confesionesSchema.findOneAndUpdate(
                { guildId: guild.id },
                {
                    channelId: channel.id
                },
                { new: true }
            );

            return correReply(
                interaction,
                `✅ Sistema de confesiones actualizado a ${channel}`,
                true
            );

        } catch (error) {

            console.log(error);

            return errReply(
                interaction,
                '❌ Ocurrió un error al configurar el sistema de confesiones.',
                true
            );
        }
    }
};