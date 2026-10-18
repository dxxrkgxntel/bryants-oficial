const isLogIgnored = require("../../Utils/logsIgnored");
const {
    EmbedBuilder,
    AuditLogEvent,
    ChannelType
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    //////////////////////////////////////////////////
    // CHANNEL CREATE
    //////////////////////////////////////////////////

    name: "channelCreate",

    async execute(channel) {

        try {

            //////////////////////////////////////////////////
            // IGNORAR DMS
            //////////////////////////////////////////////////

            if (!channel.guild) return;

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({
                    Guild: channel.guild.id
                });

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // LOG CHANNEL
            //////////////////////////////////////////////////

            const logs =
                channel.guild.channels.cache.get(
                    data.Channel
                );

            if (!logs) return;

            //////////////////////////////////////////////////
            // AUDIT LOGS
            //////////////////////////////////////////////////

            const fetchedLogs =
                await channel.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.ChannelCreate
                });

            const log =
                fetchedLogs.entries.first();
            if (await isLogIgnored(data, channel.guild, channel.id, log?.executor?.id)) return;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("📁 - Canal Creado")
                    .setDescription(`📌 Canal: ${channel}\n` +`🆔 ID: \`${channel.id}\`\n` +`🛠️ Tipo: \`${ChannelType[channel.type]}\`\n\n` +`👤 Creado por: ${log?.executor || "Desconocido"}`)
                    .setThumbnail('https://i.imgur.com/2xTDN4W.png')
                    .setImage('https://i.imgur.com/joAe57D.png')

            //////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////

            await logs.send({embeds: [embed]});

        } catch (error) {

            console.log(error);

        }
    }
};