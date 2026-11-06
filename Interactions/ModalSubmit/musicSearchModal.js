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
            const query = interaction.fields.getTextInputValue("query").trim();
            if (/^https?:\/\//i.test(query)) {
                const resolved = await music.resolveQuery(query, interaction.user.id);
                if (!resolved.tracks.length) {
                    return interaction.editReply({ content: "No pude encontrar canciones reproducibles en ese enlace." });
                }
                const message = await music.enqueueTracks(interaction, resolved.tracks);
                const playlist = resolved.playlistName ? ` de **${resolved.playlistName}**` : "";
                return interaction.editReply({ content: `✅ ${message}${playlist}` });
            }

            const tracks = await music.searchTracks(query, interaction.user.id);
            if (!tracks.length) return interaction.editReply({ content: "No encontré canciones con esa búsqueda. Prueba con otro título o artista." });
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
