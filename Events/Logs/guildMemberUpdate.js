const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const logsSchema = require("../../Models/logsSchema");
const isLogIgnored = require("../../Utils/logsIgnored");
const { publishDashboardNotification } = require("../../Utils/dashboardNotifications");

module.exports = {
    name: "guildMemberUpdate",
    async execute(oldMember, newMember) {
        try {
            const timeoutAdded = !oldMember.communicationDisabledUntil && Boolean(newMember.communicationDisabledUntil);
            const timeoutRemoved = Boolean(oldMember.communicationDisabledUntil) && !newMember.communicationDisabledUntil;
            let log = null;

            if (timeoutAdded || timeoutRemoved) {
                try {
                    const fetchedLogs = await newMember.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberUpdate
                    });
                    log = fetchedLogs.entries.first() || null;
                } catch (auditError) {
                    console.warn("[Dashboard Notifications] No se pudo consultar el autor del timeout:", auditError.message);
                }

                const antiScamTimeout = timeoutAdded && log?.target?.id === newMember.id && log?.reason === "Scam detectado";
                if (!antiScamTimeout) {
                    const moderator = log?.executor
                        ? " Moderador: " + (log.executor.tag || log.executor.username) + "."
                        : "";
                    const expiresAt = newMember.communicationDisabledUntil
                        ? " Finaliza <t:" + Math.floor(new Date(newMember.communicationDisabledUntil).getTime() / 1000) + ":R>."
                        : "";
                    await publishDashboardNotification({
                        guildId: newMember.guild.id,
                        title: timeoutAdded ? "Miembro puesto en timeout" : "Timeout retirado",
                        message: (newMember.user.tag || newMember.user.username) + " (" + newMember.id + ") " +
                            (timeoutAdded ? "recibió un timeout." : "ya no tiene timeout.") + moderator +
                            (timeoutAdded ? expiresAt : ""),
                        category: "security",
                        severity: timeoutAdded ? "warning" : "info"
                    });
                }
            }

            const data = await logsSchema.findOne({ Guild: newMember.guild.id });
            if (!data || data.Enabled === false) return;
            const channel = newMember.guild.channels.cache.get(data.Channel);
            if (!channel) return;

            if (timeoutAdded) {
                if (await isLogIgnored(data, newMember.guild, null, log?.executor?.id)) return;
                const embed = new EmbedBuilder()
                    .setColor("#8A2BE2")
                    .setTitle("🔇 - Usuario Timeouteado")
                    .addFields(
                        { name: "👤 Usuario", value: String(newMember), inline: true },
                        { name: "🛡️ Moderador", value: String(log?.executor || "Desconocido"), inline: true },
                        { name: "📅 Finaliza", value: "<t:" + Math.floor(new Date(newMember.communicationDisabledUntil).getTime() / 1000) + ":R>" }
                    )
                    .setThumbnail("https://i.imgur.com/2xTDN4W.png")
                    .setImage("https://i.imgur.com/joAe57D.png");
                return channel.send({ embeds: [embed] });
            }

            if (timeoutRemoved) {
                if (await isLogIgnored(data, newMember.guild, null, log?.executor?.id)) return;
                const embed = new EmbedBuilder()
                    .setColor("#8A2BE2")
                    .setTitle("🔊 - Timeout Removido")
                    .addFields(
                        { name: "👤 Usuario", value: String(newMember), inline: true },
                        { name: "🛡️ Moderador", value: String(log?.executor || "Desconocido"), inline: true }
                    )
                    .setThumbnail("https://i.imgur.com/2xTDN4W.png")
                    .setImage("https://i.imgur.com/joAe57D.png");
                return channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.log(error);
        }
    }
};
