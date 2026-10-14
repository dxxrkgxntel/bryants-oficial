const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { renderConfiguredMessage, parseConfiguredColor } = require("./renderConfiguredMessage");

function buildBoostNotification(data, guild, booster) {
    const boosts = guild.premiumSubscriptionCount ?? guild.members.cache.filter(member => member.premiumSince).size;
    const values = { usuario: `${booster}`, servidor: guild.name, boosts };
    const title = renderConfiguredMessage(data.boostTitle, values);
    const description = renderConfiguredMessage(data.boostDescription, values);
    const text = [title ? `## ${title}` : "", description].filter(Boolean).join("\n\n");
    const components = [];

    if (data.boostImage) components.push({ type: 12, items: [{ media: { url: data.boostImage } }] });
    if (text && data.boostThumbnail) {
        components.push({ type: 9, components: [{ type: 10, content: text }], accessory: { type: 11, media: { url: data.boostThumbnail } } });
    } else if (text) {
        components.push({ type: 10, content: text });
    } else if (data.boostThumbnail) {
        components.push({ type: 12, items: [{ media: { url: data.boostThumbnail } }] });
    }

    const roles = [
        ["claim_booster", data.boosterRole],
        ["claim_booster_vip", data.boosterVipRole],
        ["claim_booster_legend", data.boosterLegendRole]
    ].map(([customId, roleId]) => ({ customId, role: guild.roles.cache.get(roleId) }))
        .filter(item => item.role);
    if (roles.length) {
        const row = new ActionRowBuilder().addComponents(roles.map(({ customId, role }) =>
            new ButtonBuilder().setCustomId(customId).setLabel(role.name.slice(0, 80)).setStyle(ButtonStyle.Secondary)
        ));
        components.push(row.toJSON());
    }
    if (!components.length) return null;

    const container = { type: 17, components };
    const accentColor = parseConfiguredColor(data.boostColor);
    if (accentColor !== null) container.accent_color = accentColor;
    return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

async function sendBoostNotification(channel, data, guild, booster) {
    const payload = buildBoostNotification(data, guild, booster);
    if (!channel || !payload) return null;
    return channel.send(payload);
}

module.exports = { buildBoostNotification, sendBoostNotification };
