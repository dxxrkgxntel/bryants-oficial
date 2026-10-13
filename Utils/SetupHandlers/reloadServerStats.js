const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const ServerStatsConfig = require("../../Models/ServerStatsConfig");
const { updateServerStats } = require("../../Functions/serverStats");

module.exports = {
    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo los administradores pueden actualizar las estadísticas del servidor.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const config = await ServerStatsConfig.findOne({ guildId: interaction.guild.id });
            if (!config) {
                return interaction.editReply("❌ No hay estadísticas configuradas. Usa primero `/setup stats`.");
            }

            const botMember = interaction.guild.members.me;
            if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.editReply("❌ Necesito el permiso `Administrar canales` para cambiar los nombres.");
            }

            const refreshed = await updateServerStats(interaction.guild);
            if (!refreshed) {
                return interaction.editReply("❌ No encontré la configuración de estadísticas del servidor.");
            }

            return interaction.editReply("✅ Canales de estadísticas actualizados. Conservé los mismos canales y apliqué los nombres del código actual.");
        } catch (error) {
            console.error("[Server Stats Reload] No pude actualizar los canales:", error);
            return interaction.editReply("❌ No pude actualizar los canales. Comprueba que existan y que el bot tenga permiso para administrarlos.");
        }
    }
};
