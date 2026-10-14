const ImageConfig = require("../../Models/ImageConfig");
const { EmbedBuilder } = require("discord.js");

const ALLOWED_EXTENSIONS = new Set([
    "png", "jpg", "jpeg", "gif", "webp", "avif",
    "mp4", "mov", "webm", "m4v", "mkv", "avi",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "txt", "csv", "rtf", "odt", "ods", "odp", "md"
]);

const ALLOWED_DOCUMENT_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/rtf",
    "text/rtf",
    "text/plain",
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation"
]);

function hasSupportedExtension(value = "") {
    const cleanValue = value.split(/[?#]/, 1)[0];
    const extension = cleanValue.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
    return Boolean(extension && ALLOWED_EXTENSIONS.has(extension));
}

function isAllowedAttachment(attachment) {
    const contentType = attachment.contentType?.split(";")[0].toLowerCase();
    return Boolean(
        contentType?.startsWith("image/") ||
        contentType?.startsWith("video/") ||
        ALLOWED_DOCUMENT_TYPES.has(contentType) ||
        hasSupportedExtension(attachment.name) ||
        hasSupportedExtension(attachment.url)
    );
}

function hasSupportedMediaLink(content = "") {
    const urls = content.match(/https?:\/\/[^\s<>]+/gi) || [];
    return urls.some(url => hasSupportedExtension(url.replace(/[),.!?]+$/, "")));
}

module.exports = {
    name: "messageCreate",

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const config = await ImageConfig.findOne({ guildId: message.guild.id });
        if (!config || config.enabled === false) return;

        const isAllowedChannel = (config.allowedChannels || []).includes(message.channel.id);
        const hasAllowedAttachment = message.attachments.some(isAllowedAttachment);
        const attachmentsAreAllowed = message.attachments.every(isAllowedAttachment);
        const hasSupportedEmbed = message.embeds.some(embed => embed.image || embed.thumbnail || embed.video);
        const hasSupportedLink = hasSupportedMediaLink(message.content);
        const hasAllowedMultimedia = hasAllowedAttachment || hasSupportedEmbed || hasSupportedLink;
        const hasAnyMultimedia = message.attachments.size > 0 ||
            hasSupportedEmbed ||
            hasSupportedLink;

        // Los canales añadidos con /moderation antimultimedia add aceptan solo
        // imágenes, vídeos y documentos; los mensajes de texto solos se borran.
        if (isAllowedChannel && hasAllowedMultimedia && attachmentsAreAllowed) return;

        // Fuera de los canales autorizados se mantiene el filtro multimedia
        // actual: el contenido adjunto o enlazado solo se publica en canales permitidos.
        if (!isAllowedChannel && !hasAnyMultimedia) return;

        await message.delete().catch(() => {});

        if (config.logChannel) {
            const logChannel = message.guild.channels.cache.get(config.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor("#8A2BE2")
                    .setTitle(isAllowedChannel ? "🚫 Mensaje no permitido en canal multimedia" : "🚫 Contenido multimedia bloqueado")
                    .addFields(
                        { name: "👤 Usuario", value: `${message.author}`, inline: true },
                        { name: "📍 Canal", value: `${message.channel}`, inline: true },
                        { name: "📝 Contenido", value: (message.content || "Sin texto").slice(0, 1024) }
                    )
                    .setThumbnail(config.thumbnail || message.author.displayAvatarURL({ dynamic: true }));

                if (config.image) embed.setImage(config.image);
                await logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }

        const warning = await message.channel.send({
            content: isAllowedChannel
                ? `🚫 ${message.author}, este canal solo permite imágenes, vídeos o documentos.`
                : `🚫 ${message.author}, solo puedes publicar contenido multimedia en los canales permitidos.`,
            allowedMentions: { users: [message.author.id] }
        }).catch(() => null);

        if (warning) setTimeout(() => warning.delete().catch(() => {}), 3000);
    }
};
