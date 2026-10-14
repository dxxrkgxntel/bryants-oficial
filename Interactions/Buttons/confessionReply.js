const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    id: "confession_reply:",
    async execute(interaction) {
        const mode = interaction.customId.split(":")[1];
        if (!interaction.guild || !["thread", "message"].includes(mode)) return;
        const modal = new ModalBuilder()
            .setCustomId(`confession_reply_submit:${mode}:${interaction.channelId}:${interaction.message.id}`)
            .setTitle("Respuesta anónima");
        const input = new TextInputBuilder()
            .setCustomId("reply")
            .setLabel("Escribe tu respuesta")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
};
