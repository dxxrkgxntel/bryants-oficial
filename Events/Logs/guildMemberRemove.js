const isLogIgnored = require("../../Utils/logsIgnored");
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const logsSchema = require("../../Models/logsSchema");
const { publishDashboardNotification } = require("../../Utils/dashboardNotifications");

module.exports = {
    name: "guildMemberRemove",
    async execute(member) {
        try {
            let log = null;
            try {
                const fetchedLogs = await member.guild.fetchAuditLogs({
                    limit: 1,
                    type: AuditLogEvent.MemberKick
                });
                log = fetchedLogs.entries.first() || null;
            } catch (auditError) {
                console.warn("[Dashboard Notifications] No se pudo consultar el autor de la expulsión:", auditError.message);
                return;
            }

            if (!log || log.target?.id !== member.id) return;

            const antiScamKick = log.reason === "Scam detectado";
            if (!antiScamKick) {
                await publishDashboardNotification({
                    guildId: member.guild.id,
                    title: "Miembro expulsado",
                    message: (member.user.tag || member.user.username) + " (" + member.id + ") fue expulsado." +
                        (log.executor ? " Moderador: " + (log.executor.tag || log.executor.username) + "." : "") +
                        (log.reason ? " Motivo: " + log.reason + "." : ""),
                    category: "security",
                    severity: "warning"
                });
            }

            const data = await logsSchema.findOne({ Guild: member.guild.id });
            if (!data || data.Enabled === false) return;
            const channel = member.guild.channels.cache.get(data.Channel);
            if (!channel || await isLogIgnored(data, member.guild, null, log.executor?.id)) return;

            const embed = new EmbedBuilder()
                .setColor("#8A2BE2")
                .setTitle("👢 - Usuario Expulsado")
                .addFields(
                    { name: "👤 Usuario", value: String(member.user), inline: true },
                    { name: "🛡️ Moderador", value: String(log.executor || "Desconocido"), inline: true },
                    { name: "📄 Razón", value: log.reason || "Sin razón" }
                )
                .setThumbnail("https://i.imgur.com/2xTDN4W.png")
                .setImage("https://i.imgur.com/joAe57D.png");

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.log(error);
        }
    }
};
