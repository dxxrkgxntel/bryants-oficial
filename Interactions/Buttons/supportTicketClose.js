const { MessageFlags } = require("discord.js");
const SupportTicket = require("../../Models/SupportTicket");
const SupportTicketConfig = require("../../Models/SupportTicketConfig");
module.exports = {
    id: "support_ticket_close:",
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ticketId = interaction.customId.slice("support_ticket_close:".length);
        const ticket = await SupportTicket.findOne({ _id: ticketId, guildId: interaction.guildId, discordChannelId: interaction.channelId });
        if (!ticket || ticket.status !== "open") return interaction.editReply({ content: "Este ticket ya está cerrado o no existe." });
        const config = await SupportTicketConfig.findOne({ guildId: interaction.guildId });
        const isOwner = ticket.userId === interaction.user.id;
        const isStaff = Boolean(interaction.memberPermissions?.has("Administrator") || (config?.staffRoleId && interaction.member?.roles?.cache?.has(config.staffRoleId)) || config?.staffUserIds?.includes(interaction.user.id));
        if (!isOwner && !isStaff) return interaction.editReply({ content: "No tienes permiso para cerrar este ticket." });
        ticket.status = "closed"; ticket.closedAt = new Date(); ticket.lastMessageAt = new Date();
        ticket.messages.push({ authorId: interaction.user.id, authorName: interaction.user.globalName || interaction.user.username, source: "system", content: "Ticket cerrado." });
        await ticket.save();
        await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => {});
        return interaction.editReply({ content: "Ticket cerrado correctamente." });
    }
};
