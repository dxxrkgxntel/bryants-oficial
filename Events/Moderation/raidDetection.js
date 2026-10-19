const logsSchema = require("../../Models/logsSchema");

// Alert-only raid detection: never auto-punishes members, avoiding false-positive mass sanctions.
const JOIN_WINDOW_MS = 10_000;
const JOIN_THRESHOLD = 7;
const ALERT_COOLDOWN_MS = 5 * 60_000;
const recentJoins = new Map();
const lastAlertAt = new Map();

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {
        try {
            if (!member?.guild || member.user?.bot) return;

            const guildId = member.guild.id;
            const now = Date.now();
            const joins = (recentJoins.get(guildId) || []).filter(timestamp => now - timestamp <= JOIN_WINDOW_MS);
            joins.push(now);
            recentJoins.set(guildId, joins);

            if (joins.length < JOIN_THRESHOLD) return;
            if (now - (lastAlertAt.get(guildId) || 0) < ALERT_COOLDOWN_MS) return;

            const config = await logsSchema.findOne({ Guild: guildId });
            if (!config || config.Enabled === false || !config.Channel) return;

            const channel = member.guild.channels.cache.get(config.Channel);
            if (!channel?.isTextBased()) return;

            const me = member.guild.members.me;
            const permissions = me ? channel.permissionsFor(me) : null;
            if (!permissions?.has(["ViewChannel", "SendMessages"])) return;

            lastAlertAt.set(guildId, now);
            await channel.send({
                content: `⚠️ **Posible raid detectado** en <#${channel.id}>: entraron **${joins.length} miembros** en los últimos ${JOIN_WINDOW_MS / 1000} segundos. Revisa la lista de miembros y activa las medidas de moderación necesarias.`,
                allowedMentions: { parse: [] }
            });
        } catch (error) {
            console.error(`[RAID DETECTION] No se pudo comprobar una entrada: ${error.message}`);
        }
    }
};
