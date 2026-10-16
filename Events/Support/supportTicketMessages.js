const SupportTicket = require("../../Models/SupportTicket");

module.exports = {
    name: "messageCreate",
    async execute(message) {
        if (!message.guild || message.author.bot || !message.content?.trim()) return;
        try {
            const ticket = await SupportTicket.findOne({ discordChannelId: message.channelId, status: "open" });
            if (!ticket) return;
            const member = message.member;
            const staffRoleId = process.env.SUPPORT_STAFF_ROLE_ID;
            const isStaff = Boolean(member?.permissions?.has("Administrator") || (staffRoleId && member?.roles?.cache?.has(staffRoleId)));
            if (message.author.id !== ticket.userId && !isStaff) return;
            ticket.messages.push({
                authorId: message.author.id,
                authorName: message.member?.displayName || message.author.globalName || message.author.username,
                authorAvatar: message.author.displayAvatarURL(),
                source: "discord",
                content: message.content.slice(0, 4000),
                discordMessageId: message.id
            });
            ticket.lastMessageAt = message.createdAt || new Date();
            await ticket.save();
        } catch (error) {
            console.error("[Support Tickets] No se pudo sincronizar un mensaje de Discord:", error.message);
        }
    }
};
