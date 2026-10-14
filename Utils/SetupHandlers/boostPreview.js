const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const boostSchema = require("../../Models/boostSchema");
const { buildBoostNotification } = require("../../Functions/boostNotification");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boost-preview")
        .setDescription("Envía una vista previa del mensaje Booster configurado")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const data = await boostSchema.findOne({ guildId: interaction.guild.id }).lean();
            if (!data?.boostChannel) return interaction.editReply({ content: "Primero selecciona un canal para los avisos Booster." });
            const channel = interaction.guild.channels.cache.get(data.boostChannel);
            if (!channel?.isTextBased()) return interaction.editReply({ content: "El canal Booster configurado ya no está disponible." });
            const payload = buildBoostNotification(data, interaction.guild, interaction.member);
            if (!payload) return interaction.editReply({ content: "Añade un título, una descripción, un banner o una miniatura antes de previsualizar el aviso." });
            await channel.send(payload);
            return interaction.editReply({ content: `Vista previa enviada en ${channel}.` });
        } catch (error) {
            console.error("[Boost] No se pudo enviar la vista previa:", error);
            const message = "No se pudo enviar la vista previa Booster.";
            if (interaction.deferred || interaction.replied) return interaction.editReply({ content: message }).catch(() => null);
            return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
    }
};
