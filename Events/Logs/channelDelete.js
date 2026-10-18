const isLogIgnored = require("../../Utils/logsIgnored");
const {
    EmbedBuilder,
    AuditLogEvent,
    ChannelType
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    name: "channelDelete",

    async execute(channel) {

        try {

            if (!channel.guild) return;

            const data =
                await logsSchema.findOne({
                    Guild: channel.guild.id
                });

            if (!data || data.Enabled === false) return;

            const logs =
                channel.guild.channels.cache.get(
                    data.Channel
                );

            if (!logs) return;

            const fetchedLogs =
                await channel.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.ChannelDelete
                });

            const log =
                fetchedLogs.entries.first();
            if (await isLogIgnored(data, channel.guild, channel.id, log?.executor?.id)) return;

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("🗑️ - Canal Eliminado")
                    .setDescription(`📌 Nombre: \`${channel.name}\`\n` +`🆔 ID: \`${channel.id}\`\n` +`🛠️ Tipo: \`${ChannelType[channel.type]}\`\n\n` +`👤 Eliminado por: ${log?.executor || "Desconocido"}`)
                    .setThumbnail('https://i.imgur.com/joAe57D.png')
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