const { EmbedBuilder } = require("discord.js");
const Confessions = require("../../Models/confesionesSetUp");

module.exports = {
    id: "confession_reply_submit:",
    async execute(interaction) {
        const [, mode, channelId, messageId] = interaction.customId.split(":");
        if (!interaction.guild || !["thread", "message"].includes(mode)) return;
        await interaction.deferReply({ ephemeral: true });
        try {
            const config = await Confessions.findOne({ guildId: interaction.guild.id });
            if (!config?.Enabled || !config.replyButtonsEnabled || (Boolean(config.repliesInThreads) !== (mode === "thread"))) {
                return interaction.editReply("Las respuestas a confesiones están desactivadas o su configuración cambió.");
            }
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            const confession = await channel?.messages.fetch(messageId).catch(() => null);
            if (!confession) return interaction.editReply("No encontré la confesión original.");
            const content = interaction.fields.getTextInputValue("reply").trim();
            if (!content) return interaction.editReply("La respuesta no puede estar vacía.");
            const response = new EmbedBuilder().setColor("#8A2BE2").setDescription(content).setTimestamp();
            if (mode === "thread") {
                let thread = confession.thread;
                if (!thread) thread = await confession.startThread({ name: "Respuestas anónimas", autoArchiveDuration: 1440 });
                await thread.send({ embeds: [response], allowedMentions: { parse: [] } });
            } else {
                await channel.send({ embeds: [response], allowedMentions: { parse: [] } });
            }
            return interaction.editReply("Tu respuesta anónima fue enviada.");
        } catch (error) {
            console.error("[Confesiones] No se pudo enviar la respuesta:", error);
            return interaction.editReply("No pude enviar la respuesta. Revisa los permisos del bot en ese canal.");
        }
    }
};
