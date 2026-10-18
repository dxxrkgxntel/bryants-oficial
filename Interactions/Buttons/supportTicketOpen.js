const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require("discord.js");
const SupportTicket = require("../../Models/SupportTicket");
const SupportTicketConfig = require("../../Models/SupportTicketConfig");

module.exports = {
    id: "support_ticket_open",
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: "Abre el panel de soporte desde un servidor de Discord.", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        let channel = null;
        let ticket = null;

        try {
            const config = await SupportTicketConfig.findOne({ enabled: true }).sort({ updatedAt: -1 });
            if (!config) {
                return interaction.editReply({ content: "El centro de soporte de Bryvex Bot aún no está configurado. El equipo debe ejecutar /setup support-tickets dentro de Bryvex Support." });
            }

            const supportGuild = await interaction.client.guilds.fetch(config.guildId).catch(() => null);
            if (!supportGuild) {
                return interaction.editReply({ content: "No encuentro el servidor Bryvex Support. Comprueba que Bryvex Bot siga dentro de ese servidor y vuelve a configurar el soporte." });
            }

            const category = interaction.customId.endsWith(":website") ? "website" : "bot";
            const existing = await SupportTicket.findOne({ userId: interaction.user.id, status: "open", category });
            if (existing?.discordChannelId) {
                const existingChannel = await supportGuild.channels.fetch(existing.discordChannelId).catch(() => null);
                if (existingChannel) {
                    return interaction.editReply({ content: `Ya tienes un ticket abierto para esta categoría en Bryvex Support: ${existingChannel}. También puedes continuar la conversación desde la web de soporte.` });
                }
            }

            const parent = config.categoryId ? await supportGuild.channels.fetch(config.categoryId).catch(() => null) : null;
            const permissionOverwrites = [
                { id: supportGuild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
                { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
            ];
            if (config.staffRoleId) {
                permissionOverwrites.push({ id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
            }

            const ticketNumber = (await SupportTicket.countDocuments({})) + 1;
            const safeUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 14) || "usuario";
            channel = await supportGuild.channels.create({
                name: `soporte-${category}-${ticketNumber}-${safeUsername}`.slice(0, 100),
                type: ChannelType.GuildText,
                parent: parent?.type === ChannelType.GuildCategory ? parent.id : undefined,
                permissionOverwrites,
                reason: `Ticket de soporte #${ticketNumber} para ${interaction.user.tag}`
            });

            const username = interaction.user.globalName || interaction.user.username;
            ticket = await SupportTicket.create({
                ticketNumber,
                userId: interaction.user.id,
                username,
                userAvatar: interaction.user.displayAvatarURL(),
                subject: category === "website" ? "Soporte web de Bryvex Bot" : "Soporte de Bryvex Bot",
                category,
                status: "open",
                source: "discord",
                guildId: supportGuild.id,
                guildName: supportGuild.name,
                discordGuildId: supportGuild.id,
                discordChannelId: channel.id,
                messages: [{
                    authorId: interaction.user.id,
                    authorName: username,
                    authorAvatar: interaction.user.displayAvatarURL(),
                    source: "system",
                    content: "Ticket creado desde Discord. El historial se comparte entre Discord y la web de soporte de Bryvex Bot."
                }]
            });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `# Ticket #${ticket.ticketNumber}\nHola <@!${interaction.user.id}>. Describe aquí tu duda o problema sobre **${category === "website" ? "la página web de Bryvex Bot" : "Bryvex Bot"}**. Todos los tickets se gestionan en **Bryvex Support** y el historial se comparte con la web.\n\n${config.staffRoleId ? `Equipo de soporte: <@&${config.staffRoleId}>` : "El equipo de soporte de Bryvex Bot atenderá tu solicitud."}`
                ))
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`support_ticket_close:${ticket.id}`).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger)
                ));

            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            return interaction.editReply({
                content: `Tu ticket #${ticket.ticketNumber} se creó en **Bryvex Support**. ${interaction.guildId === supportGuild.id ? `Canal: ${channel}` : "Si no tienes acceso al servidor de soporte, puedes continuar la conversación desde la web de Bryvex Bot."}`
            });
        } catch (error) {
            if (ticket) await SupportTicket.deleteOne({ _id: ticket._id }).catch(() => {});
            if (channel) await channel.delete("Limpieza tras error al crear ticket").catch(() => {});
            console.error("[Support Tickets] No se pudo crear el ticket:", error);
            return interaction.editReply({ content: "No pude crear tu ticket en Bryvex Support. Comprueba los permisos y la configuración del servidor de soporte." }).catch(() => {});
        }
    }
};
