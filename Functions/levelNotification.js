const { MessageFlags } = require("discord.js");
const { renderConfiguredMessage, parseConfiguredColor } = require("./renderConfiguredMessage");
const { buildV2MessageComponents } = require("./buildV2MessageComponents");

function buildLevelNotification(config, kind, values) {
    if (!config) return null;
    const titleField = kind === "role" ? "levelRoleTitle" : "levelUpTitle";
    const descriptionField = kind === "role" ? "levelRoleDescription" : "levelUpDescription";
    const title = renderConfiguredMessage(config[titleField], values);
    const description = renderConfiguredMessage(config[descriptionField], values);
    const components = buildV2MessageComponents({ title, description, banner: config.levelImage, thumbnail: config.levelThumbnail });
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
