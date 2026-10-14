const { EmbedBuilder } = require("discord.js");
const { renderConfiguredMessage, parseConfiguredColor } = require("./renderConfiguredMessage");

function safeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value.trim());
        return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
    } catch {
        return null;
    }
}

function buildConfiguredEmbed(config, { title, description, color, image, thumbnail, values = {} } = {}) {
    const embed = new EmbedBuilder();
    const renderedTitle = renderConfiguredMessage(title, values);
    const renderedDescription = renderConfiguredMessage(description, values);
    const renderedAuthor = renderConfiguredMessage(config.embedAuthorName, values);
    const renderedFooter = renderConfiguredMessage(config.embedFooterText, values);
    const accentColor = parseConfiguredColor(color);
    const safeTitle = renderedTitle.slice(0, 256);
    const safeAuthor = renderedAuthor.slice(0, 256);
    const safeFooter = renderedFooter.slice(0, 2048);
    const divider = safeTitle && renderedDescription ? "\n\n━━━━━━━━━━━━━━━━━━━━\n\n" : "";
    const descriptionLimit = Math.max(0, Math.min(4096, 6000 - safeTitle.length - safeAuthor.length - safeFooter.length) - divider.length);

    if (safeTitle) embed.setTitle(safeTitle);
    if (renderedDescription) embed.setDescription(`${divider}${renderedDescription.slice(0, descriptionLimit)}`);
    if (accentColor !== null) embed.setColor(accentColor);

    const authorUrl = safeUrl(config.embedAuthorUrl);
    const authorIcon = safeUrl(config.embedAuthorIcon);
    if (safeAuthor) {
        embed.setAuthor({
            name: safeAuthor,
            ...(authorUrl ? { url: authorUrl } : {}),
            ...(authorIcon ? { iconURL: authorIcon } : {})
        });
    }

    const footerIcon = safeUrl(config.embedFooterIcon);
    if (safeFooter) {
        embed.setFooter({
            text: safeFooter,
            ...(footerIcon ? { iconURL: footerIcon } : {})
        });
    }

    const imageUrl = safeUrl(image);
    const thumbnailUrl = safeUrl(thumbnail);
    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    if (config.embedTimestamp) embed.setTimestamp();
    if (!renderedTitle && !renderedDescription && !imageUrl && !thumbnailUrl && !renderedAuthor && !renderedFooter) return null;
    return embed;
}

module.exports = { buildConfiguredEmbed };
