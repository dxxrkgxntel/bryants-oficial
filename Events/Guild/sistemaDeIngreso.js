const { MessageFlags } = require("discord.js");
const welcomeSchema = require("../../Models/welcomeSchema");
const { renderConfiguredMessage, parseConfiguredColor } = require("../../Functions/renderConfiguredMessage");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        try {
            const data = await welcomeSchema.findOne({ Guild: member.guild.id }).lean();
            if (!data?.Channel) return;

            const channel = member.guild.channels.cache.get(data.Channel);
            if (!channel?.isTextBased()) return;

            const createdAt = Math.floor(member.user.createdTimestamp / 1000);
            const title = renderConfiguredMessage(data.Title, {
                usuario: `${member}`,
                servidor: member.guild.name,
                miembros: member.guild.memberCount,
                id: member.id,
                cuenta: `<t:${createdAt}:R>`
            });
            const description = renderConfiguredMessage(data.MessageDes, {
                usuario: `${member}`,
                servidor: member.guild.name,
                miembros: member.guild.memberCount,
                id: member.id,
                cuenta: `<t:${createdAt}:R>`
            });
            const text = [title ? `## ${title}` : "", description].filter(Boolean).join("\n\n");
            const components = [];
            if (data.Banner) components.push({ type: 12, items: [{ media: { url: data.Banner } }] });

            if (text && data.Thumbnail) {
                components.push({ type: 9, components: [{ type: 10, content: text }], accessory: { type: 11, media: { url: data.Thumbnail } } });
            } else if (text) {
                components.push({ type: 10, content: text });
            } else if (data.Thumbnail) {
                components.push({ type: 12, items: [{ media: { url: data.Thumbnail } }] });
            }
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
