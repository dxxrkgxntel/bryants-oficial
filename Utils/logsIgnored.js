const ignoredLogs = async (data, guild, sourceChannelIds = [], actorId = null) => {
    const channelIds = Array.isArray(sourceChannelIds) ? sourceChannelIds : [sourceChannelIds];
    if (channelIds.filter(Boolean).some(id => (data?.ignoredChannels || []).includes(id))) return true;
    if (!actorId || !(data?.ignoredRoles || []).length) return false;
    const member = guild.members.cache.get(actorId) || await guild.members.fetch(actorId).catch(() => null);
    return Boolean(member?.roles.cache.some(role => data.ignoredRoles.includes(role.id)));
};
module.exports = ignoredLogs;
