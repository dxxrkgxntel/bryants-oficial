const {
    getVoiceConnection,
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const VoiceConnectConfig = require("../Models/VoiceConnectConfig");

const RECONNECT_DELAY_MS = 5_000;
const READY_TIMEOUT_MS = 20_000;
const CONFIG_SYNC_INTERVAL_MS = 5_000;
let configSyncTimer = null;
let configSyncRunning = false;
const retryAfterByGuild = new Map();

function watchConnection(connection, guildId, channelId) {
    connection._persistentVoiceTarget = { guildId, channelId };
    if (connection._persistentVoiceRecoveryAttached) return;
    connection._persistentVoiceRecoveryAttached = true;

    connection.on("error", error => {
        console.error(`[VOICE CONNECT] Error en ${guildId}:`, error);
    });

    connection.on("stateChange", (_oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Ready) {
            if (connection._persistentVoiceRecoveryTimer) {
                clearTimeout(connection._persistentVoiceRecoveryTimer);
            }
            connection._persistentVoiceRecoveryTimer = null;
            return;
        }

        if (newState.status === VoiceConnectionStatus.Disconnected) {
            scheduleReconnect(
                connection,
                connection._persistentVoiceTarget.guildId,
                connection._persistentVoiceTarget.channelId
            );
        }
    });
}

function scheduleReconnect(connection, guildId, channelId) {
    if (connection._persistentVoiceRecoveryTimer) return;
    connection._persistentVoiceRecoveryTimer = setTimeout(() => {
        connection._persistentVoiceRecoveryTimer = null;
        if (connection.state.status === VoiceConnectionStatus.Destroyed) return;
        if (connection.state.status !== VoiceConnectionStatus.Disconnected) return;

        const rejoined = connection.rejoin({
            channelId,
            selfMute: true,
            selfDeaf: false
        });
        scheduleReconnect(connection, guildId, channelId);
    }, RECONNECT_DELAY_MS);
    connection._persistentVoiceRecoveryTimer.unref?.();
}

async function connectToVoiceChannel(guild, channelId) {
    let connection = getVoiceConnection(guild.id);
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        watchConnection(connection, guild.id, channelId);
    }

    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        const alreadyInChannel = connection.joinConfig.channelId === channelId;
        if (connection.state.status === VoiceConnectionStatus.Ready && alreadyInChannel) {
            return connection;
        }

        connection.rejoin({
            channelId,
            selfMute: true,
            selfDeaf: false
        });
    } else {
        connection = joinVoiceChannel({
            channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfMute: true,
            selfDeaf: false
        });
    }

    watchConnection(connection, guild.id, channelId);
    await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
    return connection;
}

async function restoreVoiceConnections(client) {
    const configs = await VoiceConnectConfig.find({});
    for (const config of configs) {
        const guild = client.guilds.cache.get(config.guildId)
            || await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.channelId)
            || await guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel?.isVoiceBased()) {
            console.warn(`[VOICE CONNECT] Canal guardado no disponible en el servidor ${guild.id}.`);
            continue;
        }

        try {
            await connectToVoiceChannel(guild, channel.id);
            console.log(`[VOICE CONNECT] Reconectado en ${guild.name} / ${channel.name}.`);
        } catch (error) {
            console.error(`[VOICE CONNECT] No pude reconectar en ${guild.id}/${channel.id}:`, error);
        }
    }
}

async function syncVoiceConnections(client) {
    const configs = await VoiceConnectConfig.find({}).lean();
    for (const config of configs) {
        const guild = client.guilds.cache.get(config.guildId)
            || await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.channelId)
            || await guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel?.isVoiceBased()) continue;

        const connection = getVoiceConnection(guild.id);
        if (connection
            && connection.state.status !== VoiceConnectionStatus.Destroyed
            && connection.joinConfig.channelId === channel.id) {
            watchConnection(connection, guild.id, channel.id);
            continue;
        }

        const retry = retryAfterByGuild.get(guild.id);
        if (retry?.channelId === channel.id && retry.nextAttemptAt > Date.now()) continue;

        try {
            await connectToVoiceChannel(guild, channel.id);
            retryAfterByGuild.delete(guild.id);
            console.log(`[VOICE CONNECT] Canal actualizado en ${guild.name} / ${channel.name}.`);
        } catch (error) {
            retryAfterByGuild.set(guild.id, { channelId: channel.id, nextAttemptAt: Date.now() + 15_000 });
            console.error(`[VOICE CONNECT] No pude actualizar el canal en ${guild.id}/${channel.id}:`, error);
        }
    }
}

function startVoiceConnectionSync(client) {
    if (configSyncTimer) return configSyncTimer;

    const sync = async () => {
        if (configSyncRunning) return;
        configSyncRunning = true;
        try {
            await syncVoiceConnections(client);
        } catch (error) {
            console.error("[VOICE CONNECT] No pude revisar la configuración de voz:", error);
        } finally {
            configSyncRunning = false;
        }
    };

    configSyncTimer = setInterval(sync, CONFIG_SYNC_INTERVAL_MS);
    configSyncTimer.unref?.();
    return configSyncTimer;
}

module.exports = {
    connectToVoiceChannel,
    restoreVoiceConnections,
    startVoiceConnectionSync
};
