const { MessageFlags } = require("discord.js");
const music = require("../../Handlers/musicManager");

module.exports = {
    id: "music-search-modal:",
    async execute(interaction) {
        const guildId = interaction.customId.split(":")[1];
        if (interaction.guildId !== guildId) {
            return interaction.reply({ content: "Esta búsqueda pertenece a otro servidor.", flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const query = interaction.fields.getTextInputValue("query");
            const tracks = await music.searchTracks(query, interaction.user.id);
            if (!tracks.length) return interaction.editReply({ content: "No encontré canciones con esa búsqueda. Prueba con otro título o enlace." });
            const result = music.createSearchMenu(tracks, interaction.user.id, guildId);
            return interaction.editReply({
                content: "🎵 **Resultados de búsqueda**\nSelecciona la canción que quieres añadir a la cola.",
                components: result.components
            });
        } catch (error) {
            return interaction.editReply({ content: `🎵 ${error.message || "No pude completar la búsqueda."}` });
        }
    }
};
