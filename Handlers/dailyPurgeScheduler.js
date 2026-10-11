const cron = require("node-cron");
const { ChannelType, PermissionFlagsBits } = require("discord.js");
const PurgeConfig = require("../Models/PurgeConfig");

const TIME_ZONE = "America/Santo_Domingo";
const BULK_DELETE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;
let isRunning = false;
const confirmationTimers = new Map();

function dateKey(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function scheduleConfirmationDelete(client, config, attempt = 0) {
    const configData = typeof config.toObject === "function" ? config.toObject() : config;
    const timerKey = `${configData.guildId}:${configData.confirmationMessageId}`;
    const existingTimer = confirmationTimers.get(timerKey);
    if (existingTimer) clearTimeout(existingTimer);

    const delay = Math.max(0, new Date(configData.confirmationDeleteAt).getTime() - Date.now());
    const timer = setTimeout(async () => {
        confirmationTimers.delete(timerKey);

        try {
            let channel = client.channels.cache.get(configData.confirmationChannelId);
            if (!channel) channel = await client.channels.fetch(configData.confirmationChannelId);
            if (!channel?.isTextBased()) throw new Error("El canal del aviso ya no está disponible.");

            const message = await channel.messages.fetch(configData.confirmationMessageId).catch(error => {
                if (error.code === 10008) return null;
                throw error;
            });
            if (message) await message.delete();

            await PurgeConfig.updateOne(
                { guildId: configData.guildId, confirmationMessageId: configData.confirmationMessageId },
                { $set: { confirmationChannelId: null, confirmationMessageId: null, confirmationDeleteAt: null } }
            );
        } catch (error) {
            console.error(`[Daily Purge] No se pudo borrar el aviso temporal ${configData.confirmationMessageId}:`, error);
            if (attempt < 3) {
                scheduleConfirmationDelete(client, {
                    ...configData,
                    confirmationDeleteAt: new Date(Date.now() + 60_000)
                }, attempt + 1);
            }
        }
    }, delay);

    timer.unref?.();
    confirmationTimers.set(timerKey, timer);
}

async function sendTemporaryConfirmation(client, config, channel) {
    let message;
    try {
        message = await channel.send("Limpieza de chats diaria realizada correctamente.");
    } catch (error) {
        console.error(`[Daily Purge] No se pudo enviar el aviso en ${channel.id}:`, error);
        return;
    }

    config.confirmationChannelId = channel.id;
    config.confirmationMessageId = message.id;
    config.confirmationDeleteAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
        await config.save();
    } catch (error) {
        console.error(`[Daily Purge] No se pudo guardar el borrado pendiente del aviso ${message.id}:`, error);
    }

    scheduleConfirmationDelete(client, config);
}

async function restorePendingConfirmations(client) {
    const configurations = await PurgeConfig.find({
        confirmationMessageId: { $ne: null },
        confirmationDeleteAt: { $ne: null }
    });

    for (const config of configurations) {
        scheduleConfirmationDelete(client, config);
    }
}

async function deleteAllMessages(channel) {
    let deletedCount = 0;
    let before;

    while (true) {
        const messages = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
        if (messages.size === 0) break;

        // Use the oldest ID from this page so new messages posted during the purge stay for the next day.
        before = messages.last().id;

        const now = Date.now();
        const recentMessages = messages.filter(message => now - message.createdTimestamp < BULK_DELETE_MAX_AGE);
        const oldMessages = messages.filter(message => now - message.createdTimestamp >= BULK_DELETE_MAX_AGE);
        let deletedThisPage = 0;

        if (recentMessages.size > 1) {
            const deleted = await channel.bulkDelete(recentMessages, true);
            deletedCount += deleted.size;
            deletedThisPage += deleted.size;
        } else if (recentMessages.size === 1) {
            try {
                await recentMessages.first().delete();
                deletedCount++;
                deletedThisPage++;
            } catch (error) {
                if (error.code !== 10008) throw error;
            }
        }

        for (const message of oldMessages.values()) {
            try {
                await message.delete();
                deletedCount++;
                deletedThisPage++;
            } catch (error) {
                if (error.code !== 10008) throw error;
            }
        }

        if (messages.size < 100) break;
        if (deletedThisPage === 0) {
            throw new Error(`No se pudo avanzar en el historial de ${channel.id}.`);
        }
    }

    return deletedCount;
}

async function processDuePurges(client) {
    if (isRunning) return;
    isRunning = true;

    try {
        const today = dateKey(new Date());
        const configurations = await PurgeConfig.find({ lastPurgeDate: { $ne: today } });

        for (const config of configurations) {
            if (!config.configuredAt || dateKey(config.configuredAt) >= today) continue;

            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) continue;

            let channel = guild.channels.cache.get(config.channelId);
            if (!channel) channel = await guild.channels.fetch(config.channelId).catch(() => null);
            if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
                console.error(`[Daily Purge] Canal no disponible para el servidor ${config.guildId}.`);
                continue;
            }

            const botMember = guild.members.me;
            const permissions = botMember && channel.permissionsFor(botMember);
            const requiredPermissions = [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageMessages
            ];

            if (!permissions || !requiredPermissions.every(permission => permissions.has(permission))) {
                console.error(`[Daily Purge] Faltan permisos para limpiar ${channel.id} en ${guild.name}.`);
                continue;
            }

            try {
                const deletedCount = await deleteAllMessages(channel);
                config.lastPurgeDate = today;
                config.lastPurgeAt = new Date();
                await config.save();
                console.log(`[Daily Purge] ${deletedCount} mensajes eliminados en #${channel.name} (${guild.name}).`);
                await sendTemporaryConfirmation(client, config, channel);
            } catch (error) {
                console.error(`[Daily Purge] Error en #${channel.name} (${guild.name}):`, error);
            }
        }
    } catch (error) {
        console.error("[Daily Purge] Error al procesar las configuraciones:", error);
    } finally {
        isRunning = false;
    }
}

module.exports = function startDailyPurgeScheduler(client) {
    cron.schedule("0 0 * * *", () => processDuePurges(client), { timezone: TIME_ZONE });
    console.log(`[Daily Purge] Programado diariamente a las 12:00 AM (${TIME_ZONE}).`);

    restorePendingConfirmations(client).catch(error => {
        console.error("[Daily Purge] Error al restaurar el borrado pendiente de avisos:", error);
    });

    // Catch up once after startup if the bot was offline at midnight.
    processDuePurges(client);
};
