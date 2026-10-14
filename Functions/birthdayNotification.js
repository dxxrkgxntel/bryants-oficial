const { MessageFlags } = require("discord.js");
const { renderConfiguredMessage, parseConfiguredColor } = require("./renderConfiguredMessage");

function buildBirthdayNotification(config, guild, user, reward = config.birthdayReward || 0) {
    const values = { usuario: `${user}`, servidor: guild.name, recompensa: Number(reward).toLocaleString() };
    const title = renderConfiguredMessage(config.birthdayTitle, values);
    const description = renderConfiguredMessage(config.birthdayDescription, values);
    const text = [title ? `## ${title}` : "", description].filter(Boolean).join("\n\n");
    const components = [];
    if (config.birthdayBanner) components.push({ type: 12, items: [{ media: { url: config.birthdayBanner } }] });
    if (text) components.push({ type: 10, content: text });
    if (!components.length) return null;

    const container = { type: 17, components };
    const color = parseConfiguredColor(config.birthdayColor);
    if (color !== null) container.accent_color = color;
    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

function renderBirthdayReminder(config, guild, user) {
    return renderConfiguredMessage(config.birthdayReminder, { usuario: `<@${user.id}>`, servidor: guild.name });
}

module.exports = { buildBirthdayNotification, renderBirthdayReminder };
