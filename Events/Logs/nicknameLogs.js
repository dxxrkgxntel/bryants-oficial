const isLogIgnored = require("../../Utils/logsIgnored");
const {
    EmbedBuilder,
    AuditLogEvent
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    name: "guildMemberUpdate",

    async execute(oldMember, newMember) {

        try {

            //////////////////////////////////////////////////
            // VALIDAR CAMBIO
            //////////////////////////////////////////////////

            if (
                oldMember.nickname ===
                newMember.nickname
            ) return;

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({

                    Guild: newMember.guild.id
                });

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                newMember.guild.channels.cache.get(
                    data.Channel
                );

            if (!channel) return;

            //////////////////////////////////////////////////
            // AUDIT LOGS
            //////////////////////////////////////////////////

            const fetchedLogs =
                await newMember.guild.fetchAuditLogs({

                    limit: 1,
                    type: AuditLogEvent.MemberUpdate
                });

            const log =
                fetchedLogs.entries.first();
            if (await isLogIgnored(data, newMember.guild, null, log?.executor?.id)) return;

            //////////////////////////////////////////////////
            // NICKNAMES
            //////////////////////////////////////////////////

            const oldNick =
                oldMember.nickname ||
                oldMember.user.username;

            const newNick =
                newMember.nickname ||
                newMember.user.username;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("✏️ - Nickname Actualizado")
                    .addFields({name: "👤 Usuario",value: `${newMember}`,inline: true},{name: "📝 Antes",value:`\`${oldNick}\``,inline: true},{name: "✨ Ahora",value:`\`${newNick}\``,inline: true},{name: "🛡️ Cambiado por",value:`${log?.executor || "Desconocido"}`})
                    .setThumbnail('https://i.imgur.com/joAe57D.png')
                    .setImage('https://i.imgur.com/joAe57D.png')

            //////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////

            await channel.send({

                embeds: [embed]
            });

        } catch (error) {

            console.log(error);

        }
    }
};