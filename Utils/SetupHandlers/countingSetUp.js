const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ChatInputCommandInteraction
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const countingSchema = require('../../Models/countingSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('contador-setup')
        .setDescription('Crea un sistema de conteo para tu servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Elige el canal donde se hará el sistema de conteo')
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
                !permissions.has('ManageMessages')
            ) {
                return errReply(
                    interaction,
                    '❌ No tengo permisos suficientes en ese canal.',
                    true
                );
            }

            const countingData = await countingSchema.findOne({
                guildId: guild.id
            });

            // ✅ CREAR
            if (!countingData) {

                await countingSchema.create({
                    guildId: guild.id,
                    channelId: channel.id,
                    number: 0
                });

                return correReply(
                    interaction,
                    `✅ Sistema de conteo configurado en ${channel}`,
                    true
                );
            }

            // ✅ ACTUALIZAR
            await countingSchema.findOneAndUpdate(
                { guildId: guild.id },
                {
                    channelId: channel.id
                },
                { new: true }
            );

            return correReply(
                interaction,
                `✅ Sistema de conteo actualizado a ${channel}`,
                true
            );

        } catch (error) {

            console.log(error);

            return errReply(
                interaction,
                '❌ Ocurrió un error al configurar el sistema de conteo.',
                true
            );
        }
    }
};