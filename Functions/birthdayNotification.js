const { buildConfiguredEmbed } = require("./buildConfiguredEmbed");

function buildBirthdayNotification(config, guild, user, reward = config.birthdayReward || 0) {
    const userData = user.user || user;
    const values = {
        usuario: `${user}`,
        username: userData.username,
        userTag: userData.tag || userData.username,
        id: userData.id,
        servidor: guild.name,
        serverId: guild.id,
        miembros: guild.memberCount,
        recompensa: Number(reward).toLocaleString()
    };
    const embed = buildConfiguredEmbed(config, {
        title: config.birthdayTitle,
        description: config.birthdayDescription,
        color: config.birthdayColor,
        image: config.birthdayBanner,
        values
    });
    return embed ? { embeds: [embed] } : null;
}

function renderBirthdayReminder(config, guild, user) {
    const userData = user.user || user;
    const values = {
        usuario: `<@${userData.id}>`,
        username: userData.username || userData.id,
        id: userData.id,
        servidor: guild.name,
        serverId: guild.id,
        miembros: guild.memberCount
    };
    const embed = buildConfiguredEmbed(config, {
        description: config.birthdayReminder,
        color: config.birthdayColor,
        values
    });
    return embed ? { embeds: [embed], allowedMentions: { users: [String(userData.id)] } } : null;
}

module.exports = { buildBirthdayNotification, renderBirthdayReminder };
