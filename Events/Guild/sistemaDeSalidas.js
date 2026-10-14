const leaveSchema = require("../../Models/leaveSchema");
const { buildConfiguredEmbed } = require("../../Functions/buildConfiguredEmbed");

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
            console.error("[Leave] No se pudo enviar el mensaje configurado:", error);
        }
    }
};
