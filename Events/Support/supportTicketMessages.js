const SupportTicket = require("../../Models/SupportTicket");
const SupportTicketConfig = require("../../Models/SupportTicketConfig");

module.exports = {
    name: "messageCreate",
    async execute(message) {
        if (!message.guild || message.author.bot || !message.content?.trim()) return;
        try {
            const ticket = await SupportTicket.findOne({ discordGuildId: message.guildId, discordChannelId: message.channelId, status: "open" });
            if (!ticket) return;
            const config = await SupportTicketConfig.findOne({ guildId: message.guildId });
            const member = message.member;
            const isStaff = Boolean(member?.permissions?.has("Administrator") || (config?.staffRoleId && member?.roles?.cache?.has(config.staffRoleId)) || config?.staffUserIds?.includes(message.author.id));
            if (message.author.id !== ticket.userId && !isStaff) return;
            ticket.messages.push({
                authorId: message.author.id,
                authorName: member?.displayName || message.author.globalName || message.author.username,
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
