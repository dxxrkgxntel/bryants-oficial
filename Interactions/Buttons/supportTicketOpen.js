const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
const SupportTicket = require("../../Models/SupportTicket");
const SupportTicketConfig = require("../../Models/SupportTicketConfig");

module.exports = {
    id: "support_ticket_open",
    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "Este panel solo funciona dentro del servidor donde fue publicado.", flags: MessageFlags.Ephemeral });
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        let channel;
        try {
            const config = await SupportTicketConfig.findOne({ guildId: interaction.guildId, enabled: true });
            if (!config) return interaction.editReply({ content: "El sistema de tickets no está configurado en este servidor. Un administrador debe ejecutar /setup support-tickets." });
            const category = interaction.customId.endsWith(":website") ? "website" : "bot";
            const existing = await SupportTicket.findOne({ userId: interaction.user.id, status: "open", guildId: interaction.guildId, category });
            if (existing?.discordChannelId) {
                const existingChannel = await interaction.guild.channels.fetch(existing.discordChannelId).catch(() => null);
                if (existingChannel) return interaction.editReply({ content: `Ya tienes un ticket abierto para esta categoría: ${existingChannel}` });
            }
            const parent = config.categoryId ? await interaction.guild.channels.fetch(config.categoryId).catch(() => null) : null;
            const permissionOverwrites = [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
            ];
            if (config.staffRoleId) permissionOverwrites.push({ id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
            channel = await interaction.guild.channels.create({
                name: `soporte-${category}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,14) || "usuario"}`,
                type: ChannelType.GuildText,
                parent: parent?.type === ChannelType.GuildCategory ? parent.id : undefined,
                permissionOverwrites,
                reason: `Ticket de soporte para ${interaction.user.tag}`
            });
            const ticketNumber = (await SupportTicket.countDocuments({})) + 1;
            const username = interaction.user.globalName || interaction.user.username;
            const ticket = await SupportTicket.create({
                ticketNumber, userId: interaction.user.id, username,
                userAvatar: interaction.user.displayAvatarURL(), subject: category === "website" ? "Soporte de la página web" : "Soporte de Bryvex Bot",
                category, status: "open", source: "discord", guildId: interaction.guildId, guildName: interaction.guild.name, guildName: interaction.guild.name,
                discordGuildId: interaction.guildId, discordChannelId: channel.id,
                messages: [{ authorId: interaction.user.id, authorName: username, authorAvatar: interaction.user.displayAvatarURL(), source: "system", content: "Ticket creado desde Discord. El canal y la web comparten el historial de esta conversación." }]
            });
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Ticket #${ticket.ticketNumber}\nHola <@!${interaction.user.id}>. Describe aquí tu duda o problema sobre **${category === "website" ? "la página web de Bryant's Oficial" : "Bryvex Bot"}**. Este ticket pertenece a **${interaction.guild.name}** y su historial se comparte con la web.\n\n${config.staffRoleId ? `Equipo de soporte: <@&${config.staffRoleId}>` : "El equipo de soporte de este servidor atenderá tu solicitud."}`))
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`support_ticket_close:${ticket.id}`).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger)));
            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return interaction.editReply({ content: `Ticket creado en ${channel}.` });
        } catch (error) {
            if (channel) await channel.delete("Limpieza tras error al crear ticket").catch(() => {});
            console.error("[Support Tickets] No se pudo crear el ticket:", error);
            return interaction.editReply({ content: "No pude crear tu ticket. Comprueba los permisos y la configuración de soporte de este servidor." });
        }
    }
};
