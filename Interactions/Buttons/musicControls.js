const {
    ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require("discord.js");
const music = require("../../Handlers/musicManager");

module.exports = {
    id: "music:",
    async execute(interaction, client) {
        const [, action, guildId] = interaction.customId.split(":");
        if (interaction.guildId !== guildId) {
            return interaction.reply({ content: "Este panel pertenece a otro servidor.", flags: MessageFlags.Ephemeral });
        }
        if (action === "search") {
            const modal = new ModalBuilder()
                .setCustomId(`music-search-modal:${guildId}`)
                .setTitle("Buscar música");
            const query = new TextInputBuilder()
                .setCustomId("query")
                .setLabel("Canción, artista o enlace")
                .setPlaceholder("Escribe un título o pega un enlace compatible")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(500)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(query));
            return interaction.showModal(modal);
        }
        return music.executeButton(interaction, client);
    }
};
