const {
    getVoiceConnection,
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const VoiceConnectConfig = require("../Models/VoiceConnectConfig");

const RECONNECT_BASE_DELAY_MS = 5_000;
const RECONNECT_MAX_DELAY_MS = 60_000;
const READY_TIMEOUT_MS = 30_000;
const DISCONNECT_GRACE_MS = 7_000;
const CONFIG_SYNC_INTERVAL_MS = 15_000;

let configSyncTimer = null;
let configSyncRunning = false;
const connectionTasks = new Map();
const voiceTargetsByGuild = new Map();
const reconnectTimers = new Map();
const disconnectGraceTimers = new Map();
const reconnectAttempts = new Map();

function clearReconnectTimer(guildId) {
    const timer = reconnectTimers.get(guildId);
    if (timer) clearTimeout(timer);
    reconnectTimers.delete(guildId);
}

function clearDisconnectGrace(guildId) {
    const timer = disconnectGraceTimers.get(guildId);
    if (timer) clearTimeout(timer);
    disconnectGraceTimers.delete(guildId);
}

function clearReconnectState(guildId) {
    clearReconnectTimer(guildId);
    clearDisconnectGrace(guildId);
    reconnectAttempts.delete(guildId);
}

function getReconnectDelay(guildId) {
    const attempts = reconnectAttempts.get(guildId) || 0;
    return Math.min(RECONNECT_BASE_DELAY_MS * (2 ** Math.min(attempts, 4)), RECONNECT_MAX_DELAY_MS);
}

function describeVoiceState(state) {
    if (!state) return "desconocido";
    const details = ["estado=" + state.status];
    if (state.closeCode != null) details.push("closeCode=" + state.closeCode);
    if (state.reason != null) details.push("reason=" + state.reason);
    return details.join(", ");
}

function isExpectedReadyTimeout(error) {
    return error?.name === "AbortError" || error?.code === "ABORT_ERR" || error?.name === "TimeoutError";
}

async function waitUntilReady(connection, context) {
    try {
        await entersState(connection, VoiceConnectionStatus.Ready, READY_TIMEOUT_MS);
        return true;
    } catch (error) {
        if (isExpectedReadyTimeout(error)) {
            console.warn(
                "[VOICE CONNECT] Tiempo de espera agotado (" + (READY_TIMEOUT_MS / 1000) +
                "s) en " + context + "; " + describeVoiceState(connection.state) +
                ". Se conservará la conexión para permitir la recuperación."
            );
            return false;
        }
        throw error;
    }
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
        if (current?.state.status === VoiceConnectionStatus.Ready &&
            current.joinConfig.channelId === latestTarget.channelId) {
            clearReconnectState(guildId);
            return;
        }

        // Let @discordjs/voice finish resumable/reconnectable handshakes before joining again.
        if (current && (current.state.status === VoiceConnectionStatus.Connecting ||
            current.state.status === VoiceConnectionStatus.Signalling)) {
            const ready = await waitUntilReady(current, guildId + " (recuperación automática)");
            if (ready) {
                clearReconnectState(guildId);
                return;
            }
            if (current.state.status === VoiceConnectionStatus.Connecting ||
                current.state.status === VoiceConnectionStatus.Signalling) {
                reconnectAttempts.set(guildId, (reconnectAttempts.get(guildId) || 0) + 1);
                scheduleReconnect(guildId);
                return;
            }
        }

        reconnectAttempts.set(guildId, (reconnectAttempts.get(guildId) || 0) + 1);
        try {
            await connectToVoiceChannel(latestTarget.guild, latestTarget.channelId);
            console.log("[VOICE CONNECT] Conexión recuperada en " + latestTarget.guild.name +
                " / " + latestTarget.channelId + ".");
        } catch (error) {
            console.error("[VOICE CONNECT] Falló la reconexión en " + guildId + ": " +
                (error?.message || error) + ".");
            scheduleReconnect(guildId);
        }
    }, delay);

    timer.unref?.();
    reconnectTimers.set(guildId, timer);
}

function scheduleDisconnectRecovery(connection, guild, channelId, newState) {
    if (disconnectGraceTimers.has(guild.id)) return;
    console.warn("[VOICE CONNECT] Desconexión detectada en " + guild.id + "; " +
        describeVoiceState(newState) + ". Esperando " + (DISCONNECT_GRACE_MS / 1000) +
        "s para permitir la recuperación automática de Discord.");

    const timer = setTimeout(() => {
        disconnectGraceTimers.delete(guild.id);
        const current = getVoiceConnection(guild.id);
        const target = voiceTargetsByGuild.get(guild.id);
        if (current !== connection || !target || target.channelId !== channelId) return;

        if (current.state.status === VoiceConnectionStatus.Ready ||
            current.state.status === VoiceConnectionStatus.Connecting ||
            current.state.status === VoiceConnectionStatus.Signalling) return;

        if (current.state.status === VoiceConnectionStatus.Disconnected) scheduleReconnect(guild.id);
    }, DISCONNECT_GRACE_MS);

    timer.unref?.();
    disconnectGraceTimers.set(guild.id, timer);
}

function watchConnection(connection, guild, channelId) {
    voiceTargetsByGuild.set(guild.id, { guild, channelId });
    if (connection._bryvexVoiceRecoveryAttached) return;
    connection._bryvexVoiceRecoveryAttached = true;

    connection.on("error", error => {
        console.error("[VOICE CONNECT] Error de transporte en " + guild.id + "; " +
            describeVoiceState(connection.state) + ": " + (error?.message || error));
        scheduleReconnect(guild.id);
    });

    connection.on("stateChange", (_oldState, newState) => {
        if (newState.status === VoiceConnectionStatus.Ready) {
            clearReconnectState(guild.id);
            console.log("[VOICE CONNECT] Conexión estable en " + guild.id + "/" + channelId + ".");
            return;
        }

        if (newState.status === VoiceConnectionStatus.Connecting ||
            newState.status === VoiceConnectionStatus.Signalling) {
            clearDisconnectGrace(guild.id);
            clearReconnectTimer(guild.id);
            return;
        }

        if (newState.status === VoiceConnectionStatus.Disconnected) {
            scheduleDisconnectRecovery(connection, guild, channelId, newState);
        }
    });
}

async function performVoiceConnect(guild, channelId) {
    voiceTargetsByGuild.set(guild.id, { guild, channelId });
    try {
        return await performVoiceConnectAttempt(guild, channelId);
    } catch (error) {
        scheduleReconnect(guild.id);
        throw error;
    }
}

async function performVoiceConnectAttempt(guild, channelId) {
    let connection = getVoiceConnection(guild.id);
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        watchConnection(connection, guild, channelId);
        const sameChannel = connection.joinConfig.channelId === channelId;

        if (sameChannel && connection.state.status === VoiceConnectionStatus.Ready) {
            clearReconnectState(guild.id);
            return connection;
        }

        if (sameChannel && (connection.state.status === VoiceConnectionStatus.Connecting ||
            connection.state.status === VoiceConnectionStatus.Signalling)) {
            const ready = await waitUntilReady(connection, guild.id + " (handshake en curso)");
            if (ready) {
                clearReconnectState(guild.id);
                return connection;
            }
            if (connection.state.status === VoiceConnectionStatus.Connecting ||
                connection.state.status === VoiceConnectionStatus.Signalling) {
                throw new Error("La conexión de voz de " + guild.id +
                    " continúa negociando; se reintentará sin destruirla.");
            }
        }

        if (sameChannel && connection.state.status === VoiceConnectionStatus.Disconnected) {
            const rejoined = connection.rejoin({
                channelId,
                selfMute: true,
                selfDeaf: false
            });
            if (rejoined) {
                const ready = await waitUntilReady(connection, guild.id + " (rejoin del canal configurado)");
                if (ready) {
                    clearReconnectState(guild.id);
                    return connection;
                }
                if (connection.state.status === VoiceConnectionStatus.Connecting ||
                    connection.state.status === VoiceConnectionStatus.Signalling) {
                    throw new Error("Discord sigue negociando la reconexión de " + guild.id +
                        "; se conservará la sesión.");
                }
            }
        } else if (!sameChannel) {
            const rejoined = connection.rejoin({
                channelId,
                selfMute: true,
                selfDeaf: false
            });
            if (rejoined) {
                const ready = await waitUntilReady(connection, guild.id + " (cambio al canal configurado)");
                if (ready) {
                    clearReconnectState(guild.id);
                    return connection;
                }
            }
        }

        if (connection.state.status === VoiceConnectionStatus.Ready ||
            connection.state.status === VoiceConnectionStatus.Connecting ||
            connection.state.status === VoiceConnectionStatus.Signalling) {
            throw new Error("La conexión de " + guild.id + " sigue activa en estado " +
                connection.state.status + "; no se destruirá.");
        }

        if (connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
    }

    connection = joinVoiceChannel({
        channelId,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfMute: true,
        selfDeaf: false
    });
    watchConnection(connection, guild, channelId);

    const ready = await waitUntilReady(connection, guild.id + " (conexión inicial)");
    if (!ready) {
        throw new Error("Discord no confirmó la conexión de voz de " + guild.id +
            " dentro del tiempo esperado.");
    }

    clearReconnectState(guild.id);
    return connection;
}

function connectToVoiceChannel(guild, channelId) {
    const previousTask = connectionTasks.get(guild.id) || Promise.resolve();
    const task = previousTask.catch(() => null).then(() => performVoiceConnect(guild, channelId));
    connectionTasks.set(guild.id, task);
    task.finally(() => {
        if (connectionTasks.get(guild.id) === task) connectionTasks.delete(guild.id);
    }).catch(() => null);
    return task;
}

async function restoreVoiceConnections(client) {
    const configs = await VoiceConnectConfig.find({}).lean();
    for (const config of configs) {
        if (config.enabled === false || !config.channelId) {
            const connection = getVoiceConnection(config.guildId);
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            voiceTargetsByGuild.delete(config.guildId);
            clearReconnectState(config.guildId);
            continue;
        }

        const guild = client.guilds.cache.get(config.guildId) ||
            await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.channelId) ||
            await guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel?.isVoiceBased()) {
            console.warn("[VOICE CONNECT] Canal guardado no disponible en el servidor " + guild.id + ".");
            continue;
        }

        try {
            await connectToVoiceChannel(guild, channel.id);
            console.log("[VOICE CONNECT] Conectado en " + guild.name + " / " + channel.name + ".");
        } catch (error) {
            console.error("[VOICE CONNECT] No pude conectar en " + guild.id + "/" + channel.id +
                ": " + (error?.message || error) + ".");
            scheduleReconnect(guild.id);
        }
    }
}

async function syncVoiceConnections(client) {
    const configs = await VoiceConnectConfig.find({}).lean();
    for (const config of configs) {
        if (config.enabled === false || !config.channelId) {
            const connection = getVoiceConnection(config.guildId);
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) connection.destroy();
            voiceTargetsByGuild.delete(config.guildId);
            clearReconnectState(config.guildId);
            continue;
        }

        const guild = client.guilds.cache.get(config.guildId) ||
            await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) continue;

        const channel = guild.channels.cache.get(config.channelId) ||
            await guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel?.isVoiceBased()) continue;

        voiceTargetsByGuild.set(guild.id, { guild, channelId: channel.id });
        const connection = getVoiceConnection(guild.id);

        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed &&
            connection.joinConfig.channelId === channel.id) {
            watchConnection(connection, guild, channel.id);
            if (connection.state.status === VoiceConnectionStatus.Ready) {
                clearReconnectState(guild.id);
            } else if (connection.state.status === VoiceConnectionStatus.Disconnected) {
                scheduleDisconnectRecovery(connection, guild, channel.id, connection.state);
            }
            continue;
        }

        try {
            await connectToVoiceChannel(guild, channel.id);
            console.log("[VOICE CONNECT] Canal sincronizado en " + guild.name + " / " + channel.name + ".");
        } catch (error) {
            console.error("[VOICE CONNECT] No pude sincronizar el canal en " + guild.id + "/" +
                channel.id + ": " + (error?.message || error) + ".");
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
            console.error("[VOICE CONNECT] No pude revisar la configuración de voz: " +
                (error?.message || error) + ".");
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
