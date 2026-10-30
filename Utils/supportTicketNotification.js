function buildSupportReplyNotification(ticket) {
    let supportUrl = "https://bryvex.xyz/support";
    try {
        supportUrl = new URL("/support", process.env.APP_URL || "https://bryvex.xyz").toString();
        if (/^[a-f\d]{24}$/i.test(String(ticket?._id || ""))) {
            supportUrl += `?ticket=${encodeURIComponent(String(ticket._id))}`;
        }
    } catch {}

    const destinations = [`Web: ${supportUrl}`];
    const guildId = ticket?.discordGuildId || ticket?.guildId;
    if (guildId && ticket?.discordChannelId) {
        destinations.push(`Discord: https://discord.com/channels/${encodeURIComponent(guildId)}/${encodeURIComponent(ticket.discordChannelId)}`);
    }
    return `El equipo de Bryvex Support respondió tu ticket #${ticket?.ticketNumber}. Revísalo y continúa la conversación aquí:\n${destinations.join("\n")}`;
}

module.exports = { buildSupportReplyNotification };
