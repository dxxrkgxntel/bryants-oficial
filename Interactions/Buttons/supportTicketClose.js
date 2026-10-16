const { MessageFlags } = require("discord.js");
const SupportTicket = require("../../Models/SupportTicket");
module.exports = {
    id: "support_ticket_close:",
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const ticketId = interaction.customId.slice("support_ticket_close:".length);
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket || ticket.status !== "open") return interaction.editReply({ content: "Este ticket ya está cerrado o no existe." });
        const staffRoleId = process.env.SUPPORT_STAFF_ROLE_ID;
        const isOwner = ticket.userId === interaction.user.id;
        const isStaff = interaction.memberPermissions?.has("Administrator") || (staffRoleId && interaction.member?.roles?.cache?.has(staffRoleId));
        if (!isOwner && !isStaff) return interaction.editReply({ content: "No tienes permiso para cerrar este ticket." });
        ticket.status = "closed"; ticket.closedAt = new Date();
        ticket.messages.push({ authorId: interaction.user.id, authorName: interaction.user.globalName || interaction.user.username, source: "system", content: "Ticket cerrado." });
        await ticket.save();
        await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => {});
        return interaction.editReply({ content: "Ticket cerrado correctamente." });
    }
};
