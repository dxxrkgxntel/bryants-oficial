const welcomeSchema = require("../../Models/welcomeSchema");
const { buildConfiguredEmbed } = require("../../Functions/buildConfiguredEmbed");

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        try {
            const data = await welcomeSchema.findOne({ Guild: member.guild.id }).lean();
            if (!data?.Channel) return;

            const channel = member.guild.channels.cache.get(data.Channel);
            if (!channel?.isTextBased()) return;

            const createdAt = Math.floor(member.user.createdTimestamp / 1000);
            const values = {
                usuario: `${member}`,
                username: member.user.username,
                userTag: member.user.tag || member.user.username,
                servidor: member.guild.name,
                serverId: member.guild.id,
                miembros: member.guild.memberCount,
                id: member.id,
                cuenta: `<t:${createdAt}:R>`,
                accountCreated: `<t:${createdAt}:R>`
            };
            const embed = buildConfiguredEmbed(data, {
                title: data.Title,
                description: data.MessageDes,
                color: data.Color,
                image: data.Banner,
                thumbnail: data.Thumbnail,
                values
            });
            if (embed) await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error("[Welcome] No se pudo enviar el mensaje configurado:", error);
        }
    }
};
