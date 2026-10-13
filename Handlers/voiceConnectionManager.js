const {
    getVoiceConnection,
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const VoiceConnectConfig = require("../Models/VoiceConnectConfig");

const RECONNECT_DELAY_MS = 5_000;
const READY_TIMEOUT_MS = 20_000;

function watchConnection(connection, guildId, channelId) {
    connection._persistentVoiceTarget = { guildId, channelId };
    if (connection._persistentVoiceRecoveryAttached) return;
    connection._persistentVoiceRecoveryAttached = true;

    connection.on("error", error => {
        console.error(`[Voice Connect] Error en ${guildId}:`, error);
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
            console.warn(`[Voice Connect] Canal guardado no disponible en el servidor ${guild.id}.`);
            continue;
        }

        try {
            await connectToVoiceChannel(guild, channel.id);
            console.log(`[Voice Connect] Reconectado en ${guild.name} / ${channel.name}.`);
        } catch (error) {
            console.error(`[Voice Connect] No pude reconectar en ${guild.id}/${channel.id}:`, error);
        }
    }
}

module.exports = {
    connectToVoiceChannel,
    restoreVoiceConnections
};
