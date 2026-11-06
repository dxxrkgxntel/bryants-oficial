const isLogIgnored = require("../../Utils/logsIgnored");
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const logsSchema = require("../../Models/logsSchema");
const { publishDashboardNotification } = require("../../Utils/dashboardNotifications");

module.exports = {
    name: "guildBanAdd",
    async execute(ban) {
        try {
            let log = null;
            try {
                const fetchedLogs = await ban.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberBanAdd
                });
                log = fetchedLogs.entries.first() || null;
            } catch (auditError) {
                console.warn("[Dashboard Notifications] No se pudo consultar el autor del baneo:", auditError.message);
            }

            const antiScamBan = log?.target?.id === ban.user.id && log?.reason === "Scam detectado";
            if (!antiScamBan) {
                await publishDashboardNotification({
                    guildId: ban.guild.id,
                    title: "Usuario baneado",
                    message: (ban.user.tag || ban.user.username) + " (" + ban.user.id + ") fue baneado." +
                        (log?.executor ? " Moderador: " + (log.executor.tag || log.executor.username) + "." : "") +
                        (log?.reason ? " Motivo: " + log.reason + "." : ""),
                    category: "security",
                    severity: "warning"
                });
            }

            const data = await logsSchema.findOne({ Guild: ban.guild.id });
            if (!data || data.Enabled === false) return;
            const channel = ban.guild.channels.cache.get(data.Channel);
            if (!channel) return;
            if (await isLogIgnored(data, ban.guild, null, log?.executor?.id)) return;

            const embed = new EmbedBuilder()
                .setColor("#8A2BE2")
                .setTitle("🔨 - Usuario Baneado")
                .addFields(
                    { name: "👤 Usuario", value: String(ban.user), inline: true },
                    { name: "🛡️ Moderador", value: String(log?.executor || "Desconocido"), inline: true },
                    { name: "📄 Razón", value: log?.reason || "Sin razón" }
                )
                .setThumbnail("https://i.imgur.com/2xTDN4W.png")
                .setImage("https://i.imgur.com/joAe57D.png");
            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.log(error);
        }
    }
};
