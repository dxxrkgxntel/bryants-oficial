const {
    getVoiceConnection,
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const VoiceConnectConfig = require("../Models/VoiceConnectConfig");

const RECONNECT_BASE_DELAY_MS = 5_000;
const RECONNECT_MAX_DELAY_MS = 60_000;
const READY_TIMEOUT_MS = 20_000;
const CONFIG_SYNC_INTERVAL_MS = 5_000;

let configSyncTimer = null;
let configSyncRunning = false;

// A guild must never have two manager-driven connection attempts running at once.
const connectionTasks = new Map();
const voiceTargetsByGuild = new Map();
const reconnectTimers = new Map();
const reconnectAttempts = new Map();

function clearReconnectTimer(guildId) {
    const timer = reconnectTimers.get(guildId);
    if (timer) clearTimeout(timer);
    reconnectTimers.delete(guildId);
}

function clearReconnectState(guildId) {
    clearReconnectTimer(guildId);
    reconnectAttempts.delete(guildId);
}

function getReconnectDelay(guildId) {
    const attempts = reconnectAttempts.get(guildId) || 0;
    return Math.min(
        RECONNECT_BASE_DELAY_MS * (2 ** Math.min(attempts, 4)),
        RECONNECT_MAX_DELAY_MS
    );
}

function scheduleReconnect(guildId) {
    if (reconnectTimers.has(guildId)) return;

    const target = voiceTargetsByGuild.get(guildId);
    if (!target?.guild || !target.channelId) return;

    const delay = getReconnectDelay(guildId);
    const timer = setTimeout(async () => {
        reconnectTimers.delete(guildId);

        const latestTarget = voiceTargetsByGuild.get(guildId);
        if (!latestTarget?.guild || !latestTarget.channelId) return;

        const current = getVoiceConnection(guildId);
        if (current?.state.status === VoiceConnectionStatus.Ready
            && current.joinConfig.channelId === latestTarget.channelId) {
            clearReconnectState(guildId);
            return;
        }

        reconnectAttempts.set(guildId, (reconnectAttempts.get(guildId) || 0) + 1);

        try {
            await connectToVoiceChannel(latestTarget.guild, latestTarget.channelId);
            console.log(
                `[VOICE CONNECT] Recuperé la conexión en ${latestTarget.guild.name} / ${latestTarget.channelId}.`
            );
        } catch (error) {
            console.error(
                `[VOICE CONNECT] Falló la reconexión en ${guildId}; nuevo intento programado:`,
                error
            );
            scheduleReconnect(guildId);
        }
    }, delay);

    timer.unref?.();
    reconnectTimers.set(guildId, timer);
}

function watchConnection(connection, guild, channelId) {
    voiceTargetsByGuild.set(guild.id, { guild, channelId });

    // The listeners belong to this VoiceConnection, not to every sync cycle.
    if (connection._bryvexVoiceRecoveryAttached) return;
    connection._bryvexVoiceRecoveryAttached = true;

    connection.on("error", error => {
        console.error(
            `[VOICE CONNECT] Error en ${guild.id} (estado: ${connection.state.status}):`,
            error
        );
        scheduleReconnect(guild.id);
    });

    connection.on("stateChange", (_oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Ready) {
            clearReconnectState(guild.id);
            return;
        }

        if (newState.status === VoiceConnectionStatus.Disconnected) {
            scheduleReconnect(guild.id);
        }
    });
}

async function performVoiceConnect(guild, channelId) {
    voiceTargetsByGuild.set(guild.id, { guild, channelId });

    let connection = getVoiceConnection(guild.id);
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        watchConnection(connection, guild, channelId);

        const sameChannel = connection.joinConfig.channelId === channelId;
        if (sameChannel && connection.state.status === VoiceConnectionStatus.Ready) {
            clearReconnectState(guild.id);
            return connection;
        }

        // Give an in-progress handshake time to finish before replacing it.
        if (sameChannel && (
            connection.state.status === VoiceConnectionStatus.Connecting
            || connection.state.status === VoiceConnectionStatus.Signalling
        )) {
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
                clearReconnectState(guild.id);
                return connection;
            } catch {
                // A stalled handshake is replaced below instead of being left hanging.
            }
        } else {
            const rejoined = connection.rejoin({
                channelId,
                selfMute: true,
                selfDeaf: false
            });

            if (rejoined) {
                try {
                    await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
                    clearReconnectState(guild.id);
                    return connection;
                } catch {
                    // A failed rejoin must not leave a stale connection blocking recovery.
                }
            }
        }

        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
        }
    }

    connection = joinVoiceChannel({
        channelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfMute: true,
        selfDeaf: false
    });

    watchConnection(connection, guild, channelId);

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
        clearReconnectState(guild.id);
        return connection;
    } catch (error) {
        // Keep the configured destination and retry automatically after transient gateway errors.
        scheduleReconnect(guild.id);
        throw error;
    }
}

function connectToVoiceChannel(guild, channelId) {
    const previousTask = connectionTasks.get(guild.id) || Promise.resolve();
    const task = previousTask
        .catch(() => null)
        .then(() => performVoiceConnect(guild, channelId));

    connectionTasks.set(guild.id, task);
    task.finally(() => {
        if (connectionTasks.get(guild.id) === task) {
            connectionTasks.delete(guild.id);
        }
    }).catch(() => null);

    return task;
}

async function restoreVoiceConnections(client) {
    const configs = await VoiceConnectConfig.find({}).lean();

    for (const config of configs) {
        if (config.enabled === false || !config.channelId) {
            const connection = getVoiceConnection(config.guildId);
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
            voiceTargetsByGuild.delete(config.guildId);
            clearReconnectState(config.guildId);
            continue;
        }

        const guild = client.guilds.cache.get(config.guildId)
            || await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.channelId)
            || await guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel?.isVoiceBased()) {
            console.warn(
                `[VOICE CONNECT] Canal guardado no disponible en el servidor ${guild.id}.`
            );
            continue;
        }

        try {
            await connectToVoiceChannel(guild, channel.id);
            console.log(`[VOICE CONNECT] Reconectado en ${guild.name} / ${channel.name}.`);
        } catch (error) {
            console.error(
                `[VOICE CONNECT] No pude reconectar en ${guild.id}/${channel.id}:`,
                error
            );
            scheduleReconnect(guild.id);
        }
    }
}

async function syncVoiceConnections(client) {
    const configs = await VoiceConnectConfig.find({}).lean();

    for (const config of configs) {
        if (config.enabled === false || !config.channelId) {
            const connection = getVoiceConnection(config.guildId);
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
            voiceTargetsByGuild.delete(config.guildId);
            clearReconnectState(config.guildId);
            continue;
        }

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
            watchConnection(connection, guild, channel.id);

            if (connection.state.status === VoiceConnectionStatus.Ready) {
                clearReconnectState(guild.id);
            } else {
                // Do not mistake a matching channel ID for a healthy voice connection.
                scheduleReconnect(guild.id);
            }
            continue;
        }

        try {
            await connectToVoiceChannel(guild, channel.id);
            console.log(
                `[VOICE CONNECT] Canal actualizado en ${guild.name} / ${channel.name}.`
            );
        } catch (error) {
            console.error(
                `[VOICE CONNECT] No pude actualizar el canal en ${guild.id}/${channel.id}:`,
                error
            );
            scheduleReconnect(guild.id);
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
            console.error(
                "[VOICE CONNECT] No pude revisar la configuración de voz:",
                error
            );
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
