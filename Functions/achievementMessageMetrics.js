function countMatches(value, regex) {
    return (String(value || "").match(regex) || []).length;
}

function extractMessageAchievementMetrics(message) {
    const content = String(message?.content || "");
    const attachments = [...(message?.attachments?.values?.() || [])];
    const stickers = message?.stickers;
    const metrics = {};

    const words = content.trim().match(/[^\s]+/gu) || [];
    if (words.length) metrics.words_typed = words.length;

    const characters = [...content].length;
    if (characters) metrics.characters_typed = characters;

    const imageAttachments = attachments.filter(file => {
        const type = String(file.contentType || "").toLowerCase();
        const name = String(file.name || file.url || "").toLowerCase();
        return type.startsWith("image/") && type !== "image/gif"
            || (!type && /\.(png|jpe?g|webp|avif|bmp|tiff?)($|[?#])/i.test(name));
    });
    if (imageAttachments.length) metrics.images_sent = imageAttachments.length;

    const gifAttachments = attachments.filter(file => {
        const type = String(file.contentType || "").toLowerCase();
        const name = String(file.name || file.url || "").toLowerCase();
        return type === "image/gif" || /\.gif($|[?#])/i.test(name);
    });
    const gifLinks = countMatches(content, /https?:\/\/[^\s<>]+\.(?:gif)(?:[?#][^\s<>]*)?/gi);
    if (gifAttachments.length + gifLinks) metrics.gifs_sent = gifAttachments.length + gifLinks;

    const links = countMatches(content, /https?:\/\/[^\s<>]+/gi);
    if (links) metrics.links_sent = links;

    const stickerCount = Number(stickers?.size || 0);
    if (stickerCount > 0) metrics.stickers_sent = stickerCount;

    if (attachments.length) metrics.attachments_sent = attachments.length;
    if (message?.reference?.messageId) metrics.replies_sent = 1;

    const mentionedUsers = message?.mentions?.users;
    if (mentionedUsers?.size) {
        const otherUsers = [...mentionedUsers.values()].filter(user => user.id !== message.author?.id);
        if (otherUsers.length) metrics.mentions_made = otherUsers.length;
    }

    const spoilerMatches = countMatches(content, /\|\|(?=\S)[\s\S]*?\|\|/g);
    if (spoilerMatches) metrics.spoilers_sent = 1;

    const codeBlocks = countMatches(content, /```[\s\S]*?```/g);
    if (codeBlocks) metrics.code_blocks_sent = codeBlocks;

    return metrics;
}

module.exports = { extractMessageAchievementMetrics };
