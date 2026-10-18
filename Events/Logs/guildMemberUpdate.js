const {
    EmbedBuilder,
    AuditLogEvent
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");
const isLogIgnored = require("../../Utils/logsIgnored");

module.exports = {

    name: "guildMemberUpdate",

    async execute(oldMember, newMember) {

        try {

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
                newMember.guild.channels.cache.get(data.Channel);

            if (!channel) return;

            //////////////////////////////////////////////////
            // TIMEOUT AÑADIDO
            //////////////////////////////////////////////////

            if (
                !oldMember.communicationDisabledUntil &&
                newMember.communicationDisabledUntil
            ) {

                const fetchedLogs =
                    await newMember.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberUpdate
                    });

                const log =
                    fetchedLogs.entries.first();
                if (await isLogIgnored(data, newMember.guild, null, log?.executor?.id)) return;

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🔇 - Usuario Timeouteado")
                        .addFields({name: "👤 Usuario", value: `${newMember}`, inline: true}, {name: "🛡️ Moderador", value: `${log?.executor || "Desconocido"}`, inline: true}, {name: "📅 Finaliza", value: `<t:${Math.floor(new Date(newMember.communicationDisabledUntil).getTime() / 1000)}:R>`})
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // TIMEOUT REMOVIDO
            //////////////////////////////////////////////////

            if (
                oldMember.communicationDisabledUntil &&
                !newMember.communicationDisabledUntil
            ) {

                const fetchedLogs =
                    await newMember.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberUpdate
                    });

                const log =
                    fetchedLogs.entries.first();
                if (await isLogIgnored(data, newMember.guild, null, log?.executor?.id)) return;

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🔊 - Timeout Removido")
                        .addFields({name: "👤 Usuario", value: `${newMember}`, inline: true }, {name: "🛡️ Moderador", value: `${log?.executor || "Desconocido"}`, inline: true})
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

        } catch (error) {

            console.log(error);

        }
    }
};
