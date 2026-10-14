const { buildConfiguredEmbed } = require("./buildConfiguredEmbed");

function buildLevelNotification(config, kind, values) {
    if (!config) return null;
    const titleField = kind === "role" ? "levelRoleTitle" : "levelUpTitle";
    const descriptionField = kind === "role" ? "levelRoleDescription" : "levelUpDescription";
    const embed = buildConfiguredEmbed(config, {
        title: config[titleField],
        description: config[descriptionField],
        color: config.levelColor,
        image: config.levelImage,
        thumbnail: config.levelThumbnail,
        values
    });
    return embed ? { embeds: [embed] } : null;
}

async function sendLevelNotification(channel, config, kind, values) {
    const payload = buildLevelNotification(config, kind, values);
    if (!channel || !payload) return null;
    return channel.send(payload);
}

module.exports = { buildLevelNotification, sendLevelNotification };
