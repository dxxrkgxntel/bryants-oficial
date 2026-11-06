const crypto = require("crypto");
const Giveaway = require("../Models/Giveaway");
const { buildGiveawayMessage } = require("./giveawayMessage");

async function editGiveawayMessage(client, giveaway, ended) {
    const guild = client.guilds.cache.get(giveaway.guildId) || await client.guilds.fetch(giveaway.guildId).catch(() => null);
    const channel = guild?.channels.cache.get(giveaway.channelId) || await guild?.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel || !giveaway.messageId) return false;
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) return false;
    await message.edit(buildGiveawayMessage(giveaway, { ended }));
    return true;
}

async function finishGiveaway(client, giveawayId, actorId = null, { force = false, reroll = false } = {}) {
    const now = new Date();
    const filter = { _id: giveawayId, status: "active" };
    if (!force && !reroll) filter.endAt = { $lte: now };
    const giveaway = await Giveaway.findOne(filter);
    if (!giveaway) return { ok: false, reason: "not_active" };
    const eligible = [...new Set((giveaway.entrants || []).filter(id => /^\d{17,20}$/.test(String(id))))];
    const excluded = reroll ? new Set(giveaway.winnerIds || []) : new Set();
    const pool = eligible.filter(id => !excluded.has(id));
    const count = Math.min(giveaway.winnerCount, pool.length);
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = crypto.randomInt(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const winnerIds = pool.slice(0, count);
    if (reroll) {
        giveaway.winnerIds = [...(giveaway.winnerIds || []), ...winnerIds];
    } else {
        const claimed = await Giveaway.findOneAndUpdate(
            { _id: giveaway._id, status: "active", ...(force ? {} : { endAt: { $lte: now } }) },
            { $set: { status: "ending", endedBy: actorId || null } },
            { new: true }
        );
        if (!claimed) return { ok: false, reason: "already_ending" };
        giveaway.status = "ending";
        giveaway.winnerIds = winnerIds;
        giveaway.endedAt = now;
        giveaway.endedBy = actorId || null;
    }
    try {
        if (!reroll) giveaway.status = "ended";
        await giveaway.save();
        await editGiveawayMessage(client, giveaway, true).catch(error => console.warn("[Giveaway] No se pudo editar el mensaje:", error.message));
        const guild = client.guilds.cache.get(giveaway.guildId) || await client.guilds.fetch(giveaway.guildId).catch(() => null);
        const channel = guild?.channels.cache.get(giveaway.channelId) || await guild?.channels.fetch(giveaway.channelId).catch(() => null);
        if (winnerIds.length && channel) {
            await channel.send({ content: `🎉 ¡Felicidades ${winnerIds.map(id => `<@${id}>`).join(", ")}! Ganaste **${giveaway.prize}**.`, allowedMentions: { users: winnerIds } }).catch(() => {});
        }
        return { ok: true, giveaway, winnerIds };
    } catch (error) {
        if (!reroll) {
            await Giveaway.updateOne({ _id: giveaway._id, status: "ending" }, { $set: { status: "active" } }).catch(() => {});
        }
        throw error;
    }
}

module.exports = { finishGiveaway, editGiveawayMessage };
