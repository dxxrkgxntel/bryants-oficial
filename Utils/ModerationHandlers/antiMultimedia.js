const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require("discord.js");
const ImageConfig = require("../../Models/ImageConfig");

const BANNER = "https://i.imgur.com/5xvoEat.png";

function panel(title, text, color = 0x8A2BE2) {
    return new ContainerBuilder()
        .setAccentColor(color)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(BANNER))
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

function respond(interaction, title, text, color = 0x8A2BE2) {
    return interaction.editReply({
        components: [panel(title, text, color)],
        flags: MessageFlags.IsComponentsV2
    });
}

async function getConfig(guildId) {
    let config = await ImageConfig.findOne({ guildId });
    if (!config) config = await ImageConfig.create({ guildId, allowedChannels: [] });
    if (!Array.isArray(config.allowedChannels)) config.allowedChannels = [];
    return config;
}

module.exports = {
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        const config = await getConfig(interaction.guild.id);

        if (subcommand === "add") {
            const channel = interaction.options.getChannel("canal");
            if (config.allowedChannels.includes(channel.id)) {
                return respond(interaction, "⚠️ Canal ya permitido", `${channel} ya permite contenido multimedia.`, 0xFFD700);
            }
            if (config.allowedChannels.length >= 5) {
                return respond(interaction, "❌ Límite alcanzado", "Solo puedes configurar **5 canales** permitidos.", 0xFF0000);
            }
            config.allowedChannels.push(channel.id);
            await config.save();
            return respond(interaction, "✅ Canal multimedia configurado", `En ${channel} se permitirán imágenes, vídeos y documentos. Los mensajes sin ese contenido se eliminarán automáticamente.`, 0x00FF99);
        }

        if (subcommand === "remove") {
            const channel = interaction.options.getChannel("canal");
            if (!config.allowedChannels.includes(channel.id)) {
                return respond(interaction, "⚠️ Canal no configurado", `${channel} no forma parte de los canales permitidos.`, 0xFFD700);
            }
            config.allowedChannels = config.allowedChannels.filter(id => id !== channel.id);
            await config.save();
            return respond(interaction, "✅ Canal eliminado", `${channel} fue eliminado de los canales permitidos.`, 0x00FF99);
        }

        if (subcommand === "list") {
            const valid = config.allowedChannels.filter(id => interaction.guild.channels.cache.has(id));
            const stale = config.allowedChannels.filter(id => !interaction.guild.channels.cache.has(id));
            let text = valid.length ? valid.map(id => `<#${id}>`).join("\n") : "Ninguno";
            text += `\n\n**Total:** ${valid.length}/5`;
            if (stale.length) text += `\n**Canales eliminados guardados:** ${stale.length}`;
            return respond(interaction, "📸 Canales multimedia configurados", text);
        }

        if (subcommand === "log") {
            const channel = interaction.options.getChannel("canal");
            const thumbnail = interaction.options.getAttachment("thumbnail");
            const image = interaction.options.getAttachment("image");
            if (thumbnail && !thumbnail.contentType?.startsWith("image/")) {
                return respond(interaction, "❌ Thumbnail inválida", "El archivo de thumbnail debe ser una imagen.", 0xFF0000);
            }
            if (image && !image.contentType?.startsWith("image/")) {
                return respond(interaction, "❌ Imagen inválida", "El archivo seleccionado debe ser una imagen.", 0xFF0000);
            }
            config.logChannel = channel.id;
            if (thumbnail?.url) config.thumbnail = thumbnail.url;
            if (image?.url) config.image = image.url;
            await config.save();
            return respond(interaction, "📜 Logs configurados", `Los registros del sistema multimedia se enviarán a ${channel}.`, 0x00FF99);
        }
    }
};
