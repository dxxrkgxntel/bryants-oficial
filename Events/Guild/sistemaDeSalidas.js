const { MessageFlags } = require("discord.js");
const leaveSchema = require("../../Models/leaveSchema");
const { renderConfiguredMessage, parseConfiguredColor } = require("../../Functions/renderConfiguredMessage");
const { buildV2MessageComponents } = require("../../Functions/buildV2MessageComponents");

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
                username: member.user?.username || member.id,
                userTag: member.user?.tag || member.user?.username || member.id,
                servidor: member.guild.name,
                serverId: member.guild.id,
                miembros: member.guild.memberCount,
                id: member.id
            };
            const title = renderConfiguredMessage(data.Title, values);
            const description = renderConfiguredMessage(data.MessageDes, values);
            const components = buildV2MessageComponents({ title, description, banner: data.Banner, thumbnail: data.Thumbnail });
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
