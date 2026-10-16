const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
const SupportTicket = require("../../Models/SupportTicket");

module.exports = {
    id: "support_ticket_open",
    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "Este panel solo funciona dentro del servidor de soporte.", flags: MessageFlags.Ephemeral });
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const existing = await SupportTicket.findOne({ userId: interaction.user.id, status: "open", discordGuildId: interaction.guildId });
            if (existing?.discordChannelId) {
                const channel = interaction.guild.channels.cache.get(existing.discordChannelId);
                if (channel) return interaction.editReply({ content: `Ya tienes un ticket abierto: ${channel}` });
            }
            const categoryId = process.env.SUPPORT_CATEGORY_ID;
            const staffRoleId = process.env.SUPPORT_STAFF_ROLE_ID;
            const parent = categoryId ? interaction.guild.channels.cache.get(categoryId) : null;
            const permissionOverwrites = [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] }
            ];
            if (staffRoleId) permissionOverwrites.push({ id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
            permissionOverwrites.push({ id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] });
            const channel = await interaction.guild.channels.create({
                name: `soporte-${interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,18) || "usuario"}`,
                type: ChannelType.GuildText,
                parent: parent?.type === ChannelType.GuildCategory ? parent.id : undefined,
                permissionOverwrites,
                reason: `Ticket de soporte para ${interaction.user.tag}`
            });
            const ticketNumber = (await SupportTicket.countDocuments({})) + 1;
            const ticket = await SupportTicket.create({
                ticketNumber, userId: interaction.user.id, username: interaction.user.globalName || interaction.user.username,
                userAvatar: interaction.user.displayAvatarURL(), subject: "Soporte desde Discord", category: "bot", source: "discord",
                discordGuildId: interaction.guildId, discordChannelId: channel.id,
                messages: [{ authorId: interaction.user.id, authorName: interaction.user.globalName || interaction.user.username, authorAvatar: interaction.user.displayAvatarURL(), source: "system", content: "Ticket creado desde Discord. Este canal y la web comparten el historial de la conversación." }]
            });
            const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Ticket #${ticket.ticketNumber}\nHola <@!${interaction.user.id}>. Describe aquí tu duda o problema sobre **Bryvex Bot** o la **página web de Bryant's Oficial**. El historial se guarda en el sistema de soporte compartido.\n\n${staffRoleId ? `Equipo de soporte: <@&${staffRoleId}>` : "El equipo de soporte atenderá tu solicitud."}`)).addSeparatorComponents(new SeparatorBuilder()).addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`support_ticket_close:${ticket.id}`).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger)));
            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return interaction.editReply({ content: `Ticket creado: ${channel}` });
        } catch (error) {
            console.error("[Support Tickets] No se pudo crear el ticket:", error);
            return interaction.editReply({ content: "No pude crear tu ticket. Comprueba los permisos del bot y vuelve a intentarlo." });
        }
    }
};
