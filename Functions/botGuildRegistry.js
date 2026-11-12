const BotGuildRegistry = require("../Models/BotGuildRegistry");

function guildData(guild) {
    return {
        guildId: String(guild.id),
        name: String(guild.name || "Servidor sin nombre").slice(0, 100),
        icon: guild.icon || null
    };
}

async function upsertBotGuild(guild) {
    if (!guild?.id) return;
    const data = guildData(guild);
    const now = new Date();
    await BotGuildRegistry.updateOne(
        { guildId: data.guildId },
        {
            $set: { name: data.name, icon: data.icon, lastSeenAt: now, isPresent: true, leftAt: null },
            $setOnInsert: { firstSeenAt: now }
        },
        { upsert: true }
    );
}

async function markBotGuildLeft(guild) {
    if (!guild?.id) return;
    const now = new Date();
    await BotGuildRegistry.updateOne(
        { guildId: String(guild.id) },
        { $set: { name: String(guild.name || "Servidor sin nombre").slice(0, 100), icon: guild.icon || null, isPresent: false, leftAt: now } }
    );
}

async function syncBotGuildRegistry(client) {
    const guilds = [...client.guilds.cache.values()];
    for (const guild of guilds) await upsertBotGuild(guild);
    const currentIds = guilds.map(guild => String(guild.id));
    if (currentIds.length) {
        await BotGuildRegistry.updateMany(
            { guildId: { $nin: currentIds }, isPresent: true },
            { $set: { isPresent: false, leftAt: new Date() } }
        );
    } else {
        await BotGuildRegistry.updateMany({ isPresent: true }, { $set: { isPresent: false, leftAt: new Date() } });
    }
    return guilds.length;
}

module.exports = { upsertBotGuild, markBotGuildLeft, syncBotGuildRegistry };
