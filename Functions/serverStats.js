const { ChannelType } = require("discord.js");
const ServerStatsConfig = require("../Models/ServerStatsConfig");

const pendingUpdates = new Map();

async function updateServerStats(guild) {
    const config = await ServerStatsConfig.findOne({ guildId: guild.id });
    if (!config) return false;

    const membersChannel = guild.channels.cache.get(config.membersChannelId)
        || await guild.channels.fetch(config.membersChannelId).catch(() => null);
    if (membersChannel?.type !== ChannelType.GuildVoice) {
        throw new Error("No se encontró el canal de voz de miembros configurado.");
    }
    const membersName = `「👥」𝗠𝗶𝗲𝗺𝗯𝗿𝗼𝘀: ${guild.memberCount}`;
    if (membersChannel.name !== membersName) await membersChannel.setName(membersName);

    const inviteChannel = guild.channels.cache.get(config.inviteChannelId)
        || await guild.channels.fetch(config.inviteChannelId).catch(() => null);
    if (inviteChannel?.type !== ChannelType.GuildVoice) {
        throw new Error("No se encontró el canal de voz del enlace configurado.");
    }
    const inviteName = `「🔗」𝗜𝗻𝘃𝗶𝘁𝗮𝗰𝗶𝗼𝗻: ${config.inviteLink}`;
    if (inviteChannel.name !== inviteName) await inviteChannel.setName(inviteName);

    return true;
}

function scheduleServerStatsUpdate(guild) {
    const existingTimer = pendingUpdates.get(guild.id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
        pendingUpdates.delete(guild.id);
        updateServerStats(guild).catch(error => {
            console.error(`[Server Stats] No pude actualizar ${guild.id}:`, error);
        });
    }, 1_000);
    timer.unref?.();
    pendingUpdates.set(guild.id, timer);
}

async function restoreServerStats(client) {
    const configs = await ServerStatsConfig.find({});
    for (const config of configs) {
        const guild = client.guilds.cache.get(config.guildId)
            || await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) continue;

        await updateServerStats(guild).catch(error => {
            console.error(`[Server Stats] No pude sincronizar ${guild.id} al iniciar:`, error);
        });
    }
}

module.exports = { updateServerStats, scheduleServerStatsUpdate, restoreServerStats };
