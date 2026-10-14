const { MessageFlags } = require("discord.js");
const leaveSchema = require("../../Models/leaveSchema");
const { renderConfiguredMessage, parseConfiguredColor } = require("../../Functions/renderConfiguredMessage");

module.exports = {
    name: "guildMemberRemove",
    async execute(member) {
        try {
            const data = await leaveSchema.findOne({ Guild: member.guild.id }).lean();
            if (!data?.Channel) return;

            const channel = member.guild.channels.cache.get(data.Channel);
            if (!channel?.isTextBased()) return;

            const values = {
                usuario: member.user?.tag || member.user?.username || member.id,
                servidor: member.guild.name,
                miembros: member.guild.memberCount,
                id: member.id
            };
            const title = renderConfiguredMessage(data.Title, values);
            const description = renderConfiguredMessage(data.MessageDes, values);
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
            console.error("[Leave] No se pudo enviar el mensaje configurado:", error);
        }
    }
};
