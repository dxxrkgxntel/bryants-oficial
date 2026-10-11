const { ChannelType, PermissionFlagsBits, MessageFlags } = require("discord.js");
const PurgeConfig = require("../../Models/PurgeConfig");

module.exports = {
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel");

        if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
            return interaction.reply({
                content: "❌ Elige un canal de texto o de anuncios.",
                flags: MessageFlags.Ephemeral
            });
        }

        const botMember = interaction.guild.members.me;
        const permissions = botMember && channel.permissionsFor(botMember);
        const requiredPermissions = [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageMessages
        ];

        if (!permissions || !requiredPermissions.every(permission => permissions.has(permission))) {
            return interaction.reply({
                content: "❌ Necesito permisos de ver el canal, leer el historial, enviar mensajes y administrar mensajes en ese canal.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await PurgeConfig.findOneAndUpdate(
                { guildId: interaction.guildId },
                {
                    $set: {
                        channelId: channel.id,
                        configuredAt: new Date()
                    },
                    $setOnInsert: {
                        lastPurgeDate: null,
                        lastPurgeAt: null
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return interaction.reply({
                content: `✅ Configuré ${channel} para eliminar sus mensajes todos los días a las **12:00 AM (hora de República Dominicana)**. El primer borrado será en la próxima medianoche.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error("[Purge Setup] Error al guardar el canal:", error);
            return interaction.reply({
                content: "❌ No pude guardar la configuración de limpieza automática.",
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
