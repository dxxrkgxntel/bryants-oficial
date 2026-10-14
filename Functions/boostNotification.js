const { MessageFlags } = require("discord.js");
const { renderConfiguredMessage, parseConfiguredColor } = require("./renderConfiguredMessage");
const { buildV2MessageComponents } = require("./buildV2MessageComponents");
const { buildConfiguredButtonRows } = require("./buildConfiguredButtons");

function buildBoostNotification(data, guild, booster) {
    const boosts = guild.premiumSubscriptionCount ?? guild.members.cache.filter(member => member.premiumSince).size;
    const values = {
        usuario: `${booster}`,
        username: booster.user?.username || booster.username,
        userTag: booster.user?.tag || booster.user?.username || booster.username,
        id: booster.id,
        servidor: guild.name,
        serverId: guild.id,
        miembros: guild.memberCount,
        boosts
    };
    const title = renderConfiguredMessage(data.boostTitle, values);
    const description = renderConfiguredMessage(data.boostDescription, values);
    const components = buildV2MessageComponents({ title, description, banner: data.boostImage, thumbnail: data.boostThumbnail });

    const legacyRoles = [
        ["claim_booster", data.boosterRole],
        ["claim_booster_vip", data.boosterVipRole],
        ["claim_booster_legend", data.boosterLegendRole]
    ].map(([customId, roleId]) => ({ customId, role: guild.roles.cache.get(roleId) }))
        .filter(item => item.role);
    if (Array.isArray(data.boostButtons)) {
        components.push(...buildConfiguredButtonRows(data.boostButtons, guild, "boost"));
    } else if (legacyRoles.length) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
        const row = new ActionRowBuilder().addComponents(legacyRoles.map(({ customId, role }) =>
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
