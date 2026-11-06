const logsSchema = require("../../Models/logsSchema");
const SecuritySettings = require("../../Models/SecuritySettings");
const { publishDashboardNotification } = require("../../Utils/dashboardNotifications");

const DEFAULTS = Object.freeze({
    enabled: true,
    joinThreshold: 7,
    joinWindowSeconds: 10,
    alertCooldownMinutes: 5,
    alertChannelId: null,
    notifyDashboard: true
});
const recentJoins = new Map();
const lastAlertAt = new Map();

function boundedInteger(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeSettings(document) {
    return {
        enabled: document?.enabled !== false,
        joinThreshold: boundedInteger(document?.joinThreshold, DEFAULTS.joinThreshold, 3, 50),
        joinWindowSeconds: boundedInteger(document?.joinWindowSeconds, DEFAULTS.joinWindowSeconds, 5, 120),
        alertCooldownMinutes: boundedInteger(document?.alertCooldownMinutes, DEFAULTS.alertCooldownMinutes, 1, 60),
        alertChannelId: /^\\d{17,20}$/.test(String(document?.alertChannelId || "")) ? document.alertChannelId : null,
        notifyDashboard: document?.notifyDashboard !== false
    };
}

module.exports = {
    name: "guildMemberAdd",
    async execute(member) {
        try {
            if (!member?.guild || member.user?.bot) return;
            const guildId = member.guild.id;
            const settings = normalizeSettings(await SecuritySettings.findOne({ guildId }).lean());
            if (!settings.enabled) return;

            const now = Date.now();
            const windowMs = settings.joinWindowSeconds * 1000;
            const joins = (recentJoins.get(guildId) || []).filter(timestamp => now - timestamp <= windowMs);
            joins.push(now);
            recentJoins.set(guildId, joins);
            if (joins.length < settings.joinThreshold) return;
            if (now - (lastAlertAt.get(guildId) || 0) < settings.alertCooldownMinutes * 60_000) return;

            lastAlertAt.set(guildId, now);
            const message = "Entraron " + joins.length + " miembros en " + settings.joinWindowSeconds + " segundos. Revisa la actividad reciente y aplica medidas preventivas si es necesario.";
            if (settings.notifyDashboard) {
                await publishDashboardNotification({ guildId, title: "Posible raid detectado", message, category: "security", severity: "warning" });
            }

            const logs = await logsSchema.findOne({ Guild: guildId }).lean();
            const channelId = settings.alertChannelId || (logs?.Enabled !== false ? logs?.Channel : null);
            if (!channelId) return;
            const channel = member.guild.channels.cache.get(channelId);
            if (!channel?.isTextBased()) return;
            const me = member.guild.members.me;
            const permissions = me ? channel.permissionsFor(me) : null;
            if (!permissions?.has(["ViewChannel", "SendMessages"])) return;

            await channel.send({
                content: "⚠️ **Posible raid detectado:** " + joins.length + " miembros entraron en los últimos " + settings.joinWindowSeconds + " segundos. Revisa la lista de miembros y activa las medidas de moderación necesarias.",
                allowedMentions: { parse: [] }
            });
        } catch (error) {
            console.error("[RAID DETECTION] No se pudo comprobar una entrada: " + error.message);
        }
    },
    _test: { normalizeSettings, DEFAULTS, boundedInteger }
};
