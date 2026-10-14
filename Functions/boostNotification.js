const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { buildConfiguredEmbed } = require("./buildConfiguredEmbed");

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
    const embed = buildConfiguredEmbed(data, {
        title: data.boostTitle,
        description: data.boostDescription,
        color: data.boostColor,
        image: data.boostImage,
        thumbnail: data.boostThumbnail,
        values
    });

    const roles = [
        ["claim_booster", data.boosterRole],
        ["claim_booster_vip", data.boosterVipRole],
        ["claim_booster_legend", data.boosterLegendRole]
    ].map(([customId, roleId]) => ({ customId, role: guild.roles.cache.get(roleId) }))
        .filter(item => item.role);
    const components = [];
    if (roles.length) {
        components.push(new ActionRowBuilder().addComponents(roles.map(({ customId, role }) =>
            new ButtonBuilder().setCustomId(customId).setLabel(role.name.slice(0, 80)).setStyle(ButtonStyle.Secondary)
        )).toJSON());
    }
    if (!embed && !components.length) return null;
    return { ...(embed ? { embeds: [embed] } : {}), ...(components.length ? { components } : {}) };
}

async function sendBoostNotification(channel, data, guild, booster) {
    const payload = buildBoostNotification(data, guild, booster);
    if (!channel || !payload) return null;
    return channel.send(payload);
}

module.exports = { buildBoostNotification, sendBoostNotification };
