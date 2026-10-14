const { MessageFlags } = require("discord.js");
const welcomeSchema = require("../../Models/welcomeSchema");
const { renderConfiguredMessage, parseConfiguredColor } = require("../../Functions/renderConfiguredMessage");
const { buildV2MessageComponents } = require("../../Functions/buildV2MessageComponents");
const { buildConfiguredButtonRows } = require("../../Functions/buildConfiguredButtons");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        try {
            const data = await welcomeSchema.findOne({ Guild: member.guild.id }).lean();
            if (!data) return;

            const createdAt = Math.floor(member.user.createdTimestamp / 1000);
            const title = renderConfiguredMessage(data.Title, {
                usuario: `${member}`,
                username: member.user.username,
                userTag: member.user.tag || member.user.username,
                servidor: member.guild.name,
                serverId: member.guild.id,
                miembros: member.guild.memberCount,
                id: member.id,
                cuenta: `<t:${createdAt}:R>`,
                accountCreated: `<t:${createdAt}:R>`
            });
            const description = renderConfiguredMessage(data.MessageDes, {
                usuario: `${member}`,
                username: member.user.username,
                userTag: member.user.tag || member.user.username,
                servidor: member.guild.name,
                serverId: member.guild.id,
                miembros: member.guild.memberCount,
                id: member.id,
                cuenta: `<t:${createdAt}:R>`,
                accountCreated: `<t:${createdAt}:R>`
            });

            if (data.SendDM) {
                const dmTitle = renderConfiguredMessage(data.DMTitle, {
                    usuario: `${member}`,
                    username: member.user.username,
                    userTag: member.user.tag || member.user.username,
                    servidor: member.guild.name,
                    serverId: member.guild.id,
                    miembros: member.guild.memberCount,
                    id: member.id,
                    cuenta: `<t:${createdAt}:R>`,
                    accountCreated: `<t:${createdAt}:R>`
                });
                const dmDescription = renderConfiguredMessage(data.DMMessage, {
                    usuario: `${member}`,
                    username: member.user.username,
                    userTag: member.user.tag || member.user.username,
                    servidor: member.guild.name,
                    serverId: member.guild.id,
                    miembros: member.guild.memberCount,
                    id: member.id,
                    cuenta: `<t:${createdAt}:R>`,
                    accountCreated: `<t:${createdAt}:R>`
                });
                const dmComponents = buildV2MessageComponents({ title: dmTitle, description: dmDescription, banner: data.DMBanner, thumbnail: data.DMThumbnail });
                if (dmComponents.length) {
                    const dmContainer = { type: 17, components: dmComponents };
                    const dmAccent = parseConfiguredColor(data.DMColor);
                    if (dmAccent !== null) dmContainer.accent_color = dmAccent;
                    try {
                        await member.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
                    } catch (error) {
                        console.warn(`[Welcome] No se pudo enviar el DM a ${member.id} en ${member.guild.id}:`, error.message);
                    }
                }
            }

            if (!data.Channel) return;
            const channel = member.guild.channels.cache.get(data.Channel);
            if (!channel?.isTextBased()) return;
            const components = buildV2MessageComponents({ title, description, banner: data.Banner, thumbnail: data.Thumbnail });
            components.push(...buildConfiguredButtonRows(data.Buttons, member.guild, "welcome"));
            if (!components.length) return;

            const container = { type: 17, components };
            const accentColor = parseConfiguredColor(data.Color);
            if (accentColor !== null) container.accent_color = accentColor;
            await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        } catch (error) {
            console.error("[Welcome] No se pudo enviar el mensaje configurado:", error);
        }
    }
};
