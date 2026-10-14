const { MessageFlags } = require("discord.js");
const { renderConfiguredMessage, parseConfiguredColor } = require("./renderConfiguredMessage");

function buildLevelNotification(config, kind, values) {
    if (!config) return null;
    const titleField = kind === "role" ? "levelRoleTitle" : "levelUpTitle";
    const descriptionField = kind === "role" ? "levelRoleDescription" : "levelUpDescription";
    const title = renderConfiguredMessage(config[titleField], values);
    const description = renderConfiguredMessage(config[descriptionField], values);
    const text = [title ? `## ${title}` : "", description].filter(Boolean).join("\n\n");
    const components = [];

    if (config.levelImage) components.push({ type: 12, items: [{ media: { url: config.levelImage } }] });
    if (text && config.levelThumbnail) {
        components.push({ type: 9, components: [{ type: 10, content: text }], accessory: { type: 11, media: { url: config.levelThumbnail } } });
    } else if (text) {
        components.push({ type: 10, content: text });
    } else if (config.levelThumbnail) {
        components.push({ type: 12, items: [{ media: { url: config.levelThumbnail } }] });
    }
    if (!components.length) return null;

    const container = { type: 17, components };
    const accentColor = parseConfiguredColor(config.levelColor);
    if (accentColor !== null) container.accent_color = accentColor;
    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

async function sendLevelNotification(channel, config, kind, values) {
    const payload = buildLevelNotification(config, kind, values);
    if (!channel || !payload) return null;
    return channel.send(payload);
}

module.exports = { buildLevelNotification, sendLevelNotification };
