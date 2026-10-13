const {
    ChannelType,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const PollConfig = require("../../Models/PollConfig");

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
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks
        ];
        if (!permissions || !requiredPermissions.every(permission => permissions.has(permission))) {
            return interaction.reply({
                content: "❌ Necesito permisos para ver el canal, enviar mensajes y mostrar embeds allí.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await PollConfig.findOneAndUpdate(
                { guildId: interaction.guildId },
                { $set: { channelId: channel.id, configuredAt: new Date() } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return interaction.reply({
                content: `✅ Configuré ${channel} como canal de encuestas. Las nuevas encuestas y los comandos de gestión usarán este canal.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error("[Poll Setup] Error al guardar el canal:", error);
            return interaction.reply({
                content: "❌ No pude guardar el canal de encuestas.",
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
