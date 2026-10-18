const isLogIgnored = require("../../Utils/logsIgnored");
const {
    EmbedBuilder,
    AuditLogEvent
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    name: "guildBanAdd",

    async execute(ban) {

        try {

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({
                    Guild: ban.guild.id
                });

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                ban.guild.channels.cache.get(data.Channel);

            if (!channel) return;

            //////////////////////////////////////////////////
            // AUDIT LOGS
            //////////////////////////////////////////////////

            const fetchedLogs =
                await ban.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberBanAdd
                });

            const log =
                fetchedLogs.entries.first();
            if (await isLogIgnored(data, ban.guild, null, log?.executor?.id)) return;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("🔨 - Usuario Baneado")
                    .addFields({name: "👤 Usuario", value: `${ban.user}`, inline: true}, {name: "🛡️ Moderador", value: `${log?.executor || "Desconocido"}`, inline: true}, {name: "📄 Razón", value: `${log?.reason || "Sin razón"}`})
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