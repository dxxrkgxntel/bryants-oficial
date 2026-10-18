const isLogIgnored = require("../../Utils/logsIgnored");
const {
    EmbedBuilder,
    AuditLogEvent
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    name: "guildMemberRemove",

    async execute(member) {

        try {

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({
                    Guild: member.guild.id
                });

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                member.guild.channels.cache.get(
                    data.Channel
                );

            if (!channel) return;

            //////////////////////////////////////////////////
            // AUDIT LOGS
            //////////////////////////////////////////////////

            const fetchedLogs =
                await member.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberKick
                });

            const log =
                fetchedLogs.entries.first();
            if (await isLogIgnored(data, member.guild, null, log?.executor?.id)) return;

            //////////////////////////////////////////////////
            // VALIDAR KICK REAL
            //////////////////////////////////////////////////

            if (
                !log ||
                log.target.id !== member.id
            ) {
                return;
            }

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("👢 - Usuario Expulsado")
                    .addFields({name: "👤 Usuario", value: `${member.user}`, inline: true}, {name: "🛡️ Moderador", value:`${log.executor}`, inline: true}, {name: "📄 Razón",value:`${log.reason || "Sin razón"}`})
                    .setThumbnail('https://i.imgur.com/2xTDN4W.png')
                    .setImage('https://i.imgur.com/joAe57D.png')

            //////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////

            await channel.send({embeds: [embed]});

        } catch (error) {

            console.log(error);

        }
    }
};