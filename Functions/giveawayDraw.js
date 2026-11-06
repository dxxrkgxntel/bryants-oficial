const crypto = require("node:crypto");
const Giveaway = require("../Models/Giveaway");
const { buildGiveawayMessage } = require("./giveawayMessage");
const { trackAchievementProgress } = require("./achievementTracker");

async function editGiveawayMessage(client, giveaway, ended) {
    const guild = client.guilds.cache.get(giveaway.guildId) || await client.guilds.fetch(giveaway.guildId).catch(() => null);
    const channel = guild?.channels.cache.get(giveaway.channelId) || await guild?.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel || !giveaway.messageId) return false;
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) return false;
    await message.edit(buildGiveawayMessage(giveaway, { ended }));
    return true;
}

async function finishGiveaway(client, giveawayId, actorId = null, { force = false } = {}) {
    const now = new Date();
    const filter = { _id: giveawayId, status: "active" };
    if (!force) filter.endAt = { $lte: now };
    const current = await Giveaway.findOne(filter);
    if (!current) return { ok: false, reason: "not_active" };
    const pool = [...new Set((current.entrants || []).filter(id => /^\d{17,20}$/.test(String(id))))];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = crypto.randomInt(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const winnerIds = pool.slice(0, Math.min(current.winnerCount, pool.length));
    const giveaway = await Giveaway.findOneAndUpdate(
        filter,
        { $set: { status: "ended", winnerIds, endedAt: now, endedBy: actorId || null } },
        { new: true }
    );
    if (!giveaway) return { ok: false, reason: "already_ended" };

    if (winnerIds.length) {
        const guild = client.guilds.cache.get(giveaway.guildId) || await client.guilds.fetch(giveaway.guildId).catch(() => null);
        for (const userId of winnerIds) {
            const member = await guild?.members.fetch(userId).catch(() => null);
            if (member?.user) {
                await trackAchievementProgress(guild, member.user, "giveaways_won", 1)
                    .catch(error => console.warn("[Achievements] No se pudo registrar giveaways_won:", error.message));
            }
        }
    }
    await editGiveawayMessage(client, giveaway, true).catch(error => console.warn("[Giveaway] No se pudo editar el mensaje:", error.message));
    const guild = client.guilds.cache.get(giveaway.guildId) || await client.guilds.fetch(giveaway.guildId).catch(() => null);
    const channel = guild?.channels.cache.get(giveaway.channelId) || await guild?.channels.fetch(giveaway.channelId).catch(() => null);
    if (winnerIds.length && channel) {
        await channel.send({
            content: `🎉 ¡Felicidades ${winnerIds.map(id => `<@${id}>`).join(", ")}! Ganaste **${giveaway.prize}**.`,
            allowedMentions: { users: winnerIds }
        }).catch(error => console.warn("[Giveaway] No se pudo anunciar al ganador:", error.message));
    }
    return { ok: true, giveaway, winnerIds };
}

module.exports = { finishGiveaway, editGiveawayMessage };
