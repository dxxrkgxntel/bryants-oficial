const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    WebhookClient,
    PermissionsBitField
} = require("discord.js");
const SocialAlert = require("../Models/SocialAlert");
const SocialAlertState = require("../Models/SocialAlertState");

const POLL_INTERVAL_MS = 60_000;
const VIEWER_REFRESH_MS = 5 * 60_000;
let accessToken = null;
let accessTokenExpiresAt = 0;
let twitchAccessToken = null;
let twitchAccessTokenExpiresAt = 0;
const youtubeChannelIds = new Map();
let pollRunning = false;
const warnedMissingCredentials = new Set();

async function kickRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${await getKickAccessToken()}`, Accept: "application/json", ...options.headers },
        signal: AbortSignal.timeout(12_000)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Kick API respondió ${response.status}${body?.message ? `: ${body.message}` : ""}`);
    return body;
}

async function getKickAccessToken() {
    if (accessToken && accessTokenExpiresAt > Date.now() + 30_000) return accessToken;
    const clientId = process.env.KICK_CLIENT_ID;
    const clientSecret = process.env.KICK_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Faltan KICK_CLIENT_ID o KICK_CLIENT_SECRET.");
    const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
    const response = await fetch("https://id.kick.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(12_000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token) throw new Error(`No pude autenticarme con Kick (${response.status}).`);
    accessToken = payload.access_token;
    accessTokenExpiresAt = Date.now() + (Number(payload.expires_in) || 3600) * 1000;
    return accessToken;
}

function escapePlatformText(value) {
    return String(value || "").replace(/@(?=everyone|here)/gi, "@\u200b").slice(0, 500);
}

function renderAlert(template, stream, slug, includeViewerCount, platform = "Kick") {
    const normalizedPlatform = ["TikTok", "Twitch", "YouTube"].includes(platform) ? platform : "Kick";
    const isTikTok = normalizedPlatform === "TikTok";
    const isTwitch = normalizedPlatform === "Twitch";
    const isYouTube = normalizedPlatform === "YouTube";
    const username = String(slug || "").replace(/^@+/, "");
    const values = {
        channel: escapePlatformText(stream.broadcaster?.username || stream.channel?.slug || username),
        title: escapePlatformText(stream.stream_title || stream.title || "En directo"),
        viewers: includeViewerCount ? Number(stream.viewer_count || 0).toLocaleString("es") : "",
        category: escapePlatformText(stream.category?.name || ""),
        platform,
        url: stream.url || (isTikTok ? `https://www.tiktok.com/@${encodeURIComponent(username)}/live` : isTwitch ? `https://www.twitch.tv/${encodeURIComponent(username)}` : isYouTube ? `https://www.youtube.com/@${encodeURIComponent(username)}/live` : `https://kick.com/${encodeURIComponent(username)}`)
    };
    return String(template || "").replace(/\{\{(channel|title|viewers|category|platform|url)\}\}/gi, (_match, token) => values[token.toLowerCase()] ?? "").slice(0, 2000);
}

function makeComponents(title, content, image, color) {
    const panel = new ContainerBuilder();
    const parsedColor = /^#[0-9a-f]{6}$/i.test(color || "") ? Number.parseInt(color.slice(1), 16) : 0x53FC18;
    panel.setAccentColor(parsedColor);
    if (image) panel.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)));
    panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title || "🔴 Directo en vivo"}`));
    panel.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(content || "Canal en directo."));
    return [panel];
}

function allowedMentionsFor(template) {
    return { parse: /@(everyone|here)/i.test(template) ? ["everyone"] : [], users: [], roles: [] };
}

async function getKickStream(slug) {
    const url = new URL("https://api.kick.com/public/v1/channels");
    url.searchParams.set("slug", slug);
    const payload = await kickRequest(url);
    return payload?.data?.[0] || null;
}

async function getTikTokLiveInfo(username) {
    const normalized = String(username || "").trim().replace(/^@+/, "");
    if (!/^[a-zA-Z0-9._-]{2,50}$/.test(normalized)) throw new Error("El usuario de TikTok no tiene un formato válido.");
    const url = new URL("https://www.tiktok.com/api-live/user/room/");
    url.searchParams.set("aid", "1988");
    url.searchParams.set("app_name", "tiktok_web");
    url.searchParams.set("app_language", "en-US");
    url.searchParams.set("browser_language", "en-US");
    url.searchParams.set("browser_name", "Mozilla");
    url.searchParams.set("browser_online", "true");
    url.searchParams.set("browser_platform", "Win32");
    url.searchParams.set("device_platform", "web_pc");
    url.searchParams.set("uniqueId", normalized);
    url.searchParams.set("sourceType", "54");
    const response = await fetch(url, {
        headers: {
            Accept: "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Referer: `https://www.tiktok.com/@${encodeURIComponent(normalized)}`
        },
        signal: AbortSignal.timeout(12_000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`TikTok respondió ${response.status}.`);
    if (payload?.message === "user_not_found" || payload?.statusCode === 10221) throw new Error(`TikTok no encontró el usuario @${normalized}.`);
    const data = payload?.data;
    const room = data?.liveRoom;
    const user = data?.user;
    if (!data || (!room && !user)) throw new Error("TikTok devolvió una respuesta sin datos de directo; puede haber bloqueado o cambiado su API web.");
    const roomStatus = Number(room?.status);
    if (!room || roomStatus !== 2) return { isLive: false, stream: null };
    const roomId = String(room.roomId || room.id || "");
    return {
        isLive: true,
        stream: {
            id: roomId || `${normalized}:${room.create_time || "live"}`,
            stream_title: room.title || room.liveRoomUserInfo?.title || "En directo en TikTok",
            viewer_count: Number(room.userCount || room.viewerCount || 0),
            category: { name: room.category || room.game_name || "" },
            broadcaster: { username: user.nickname || user.uniqueId || normalized },
            url: `https://www.tiktok.com/@${encodeURIComponent(normalized)}/live`
        }
    };
}

async function getTwitchAccessToken() {
    if (twitchAccessToken && twitchAccessTokenExpiresAt > Date.now() + 30_000) return twitchAccessToken;
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Faltan TWITCH_CLIENT_ID o TWITCH_CLIENT_SECRET.");
    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(12_000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.access_token) throw new Error(`No pude autenticarme con Twitch (${response.status}).`);
    twitchAccessToken = payload.access_token;
    twitchAccessTokenExpiresAt = Date.now() + (Number(payload.expires_in) || 3600) * 1000;
    return twitchAccessToken;
}

async function getTwitchLiveInfo(login) {
    const normalized = String(login || "").trim().replace(/^@+/, "").toLowerCase();
    if (!/^[a-z0-9_]{1,25}$/.test(normalized)) throw new Error("El usuario de Twitch no tiene un formato válido.");
    const clientId = process.env.TWITCH_CLIENT_ID;
    const token = await getTwitchAccessToken();
    const url = new URL("https://api.twitch.tv/helix/streams");
    url.searchParams.set("user_login", normalized);
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Twitch API respondió ${response.status}${payload?.message ? `: ${payload.message}` : ""}.`);
    const data = payload?.data?.[0];
    if (!data) return { stream: null };
    return {
        stream: {
            id: String(data.id),
            stream_title: data.title || "En directo",
            viewer_count: Number(data.viewer_count || 0),
            category: { name: data.game_name || "" },
            broadcaster: { username: data.user_name || normalized },
            start_time: data.started_at,
            url: `https://www.twitch.tv/${encodeURIComponent(data.user_login || normalized)}`
        }
    };
}

function normalizeYouTubeHandle(input) {
    let value = String(input || "").trim();
    try {
        if (/^https?:\/\//i.test(value)) {
            const url = new URL(value);
            if (!/(^|\.)youtube\.com$/i.test(url.hostname)) throw new Error("Usa un enlace de youtube.com.");
            value = url.pathname.split("/").filter(Boolean)[0] || "";
        }
    } catch (error) {
        if (error.message === "Usa un enlace de youtube.com.") throw error;
        throw new Error("El canal de YouTube no tiene un formato válido.");
    }
    value = value.replace(/^@+/, "").trim();
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(value)) throw new Error("Escribe el @handle de YouTube o la URL youtube.com/@handle.");
    return value;
}

async function youtubeApiRequest(endpoint, params) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("Falta YOUTUBE_API_KEY.");
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    for (const [key, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(key, value);
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const reason = payload?.error?.errors?.[0]?.reason;
        const message = payload?.error?.message;
        if (reason === "quotaExceeded") throw new Error("YouTube agotó la cuota diaria de la API. Revisa Google Cloud Console.");
        throw new Error(`YouTube API respondió ${response.status}${message ? `: ${message}` : ""}.`);
    }
    return payload;
}

async function getYouTubeChannelId(handle) {
    const key = handle.toLowerCase();
    if (youtubeChannelIds.has(key)) return youtubeChannelIds.get(key);
    const payload = await youtubeApiRequest("channels", { part: "id", forHandle: `@${handle}` });
    const channelId = payload?.items?.[0]?.id;
    if (!channelId) throw new Error(`YouTube no encontró el canal @${handle}. Comprueba su @handle.`);
    youtubeChannelIds.set(key, channelId);
    return channelId;
}

async function getYouTubeLiveInfo(input) {
    const handle = normalizeYouTubeHandle(input);
    const channelId = await getYouTubeChannelId(handle);
    // activities.list and videos.list cost one quota unit each, unlike search.list's 100-unit cost.
    const activities = await youtubeApiRequest("activities", { part: "snippet,contentDetails", channelId, maxResults: "10" });
    const videoIds = [...new Set((activities?.items || []).filter(item => item.type === "upload").map(item => item.contentDetails?.upload?.videoId).filter(Boolean))];
    if (!videoIds.length) return { stream: null };
    const videos = await youtubeApiRequest("videos", { part: "snippet,liveStreamingDetails", id: videoIds.join(",") });
    const video = (videos?.items || []).find(item => item.snippet?.liveBroadcastContent === "live" && !item.liveStreamingDetails?.actualEndTime);
    if (!video) return { stream: null };
    const title = video.snippet?.title || "En directo en YouTube";
    return {
        stream: {
            id: video.id,
            is_live: true,
            stream_title: title,
            title,
            viewer_count: Number(video.liveStreamingDetails?.concurrentViewers || 0),
            category: { name: "" },
            broadcaster: { username: handle },
            start_time: video.liveStreamingDetails?.actualStartTime,
            url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
            thumbnail: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url
        }
    };
}

async function ensureWebhook(channel, state, alert) {
    if (state.webhookId && state.webhookToken && state.webhookChannelId === channel.id) {
        return new WebhookClient({ id: state.webhookId, token: state.webhookToken });
    }
    const me = channel.guild.members.me;
    const permissions = channel.permissionsFor(me);
    if (!permissions?.has(PermissionsBitField.Flags.ManageWebhooks)) {
        throw new Error("Para personalizar el nombre o avatar de la alerta, el bot necesita Administrar webhooks en el canal.");
    }
    if (state.webhookId && state.webhookToken) {
        await new WebhookClient({ id: state.webhookId, token: state.webhookToken }).delete("Canal de alerta social actualizado").catch(() => {});
        state.webhookId = null;
        state.webhookToken = null;
        state.webhookChannelId = null;
    }
    const webhook = await channel.createWebhook({ name: (alert.displayName || `Alertas · ${alert.slug}`).slice(0, 80) });
    state.webhookId = webhook.id;
    state.webhookToken = webhook.token;
    state.webhookChannelId = channel.id;
    state.channelId = channel.id;
    await state.save();
    return new WebhookClient({ id: webhook.id, token: webhook.token });
}

async function sendLiveAlert(client, alert, state, stream) {
    const channel = await client.channels.fetch(alert.channelId).catch(() => null);
    if (!channel?.isTextBased() || !channel.guild) throw new Error("El canal de Discord configurado ya no está disponible.");
    const platform = alert.platform || "Kick";
    const content = renderAlert(alert.messageTemplate, stream, alert.slug, alert.includeViewerCount, platform);
    const options = {
        components: makeComponents(renderAlert(alert.title, stream, alert.slug, alert.includeViewerCount, platform), content, alert.image || stream.thumbnail, alert.color),
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: allowedMentionsFor(`${alert.title || ""} ${alert.messageTemplate || ""}`)
    };
    let message;
    if (alert.displayName || alert.avatarUrl) {
        const webhook = await ensureWebhook(channel, state, alert);
        message = await webhook.send({ ...options, username: alert.displayName || `${platform} · ${alert.slug}`, avatarURL: alert.avatarUrl || undefined });
    } else {
        message = await channel.send(options);
    }
    state.channelId = channel.id;
    state.messageId = message.id;
    state.lastStreamId = String(stream.id || stream.start_time || `${alert.slug}:${stream.stream_title || "live"}`);
    state.lastViewers = Number(stream.viewer_count || 0);
    state.lastViewerUpdateAt = new Date();
    await state.save();
}

async function updateViewerCount(client, alert, state, stream) {
    const viewers = Number(stream.viewer_count || 0);
    if (!alert.includeViewerCount || !state.messageId || state.lastViewers === viewers || Date.now() - new Date(state.lastViewerUpdateAt || 0).getTime() < VIEWER_REFRESH_MS) return;
    const channel = await client.channels.fetch(alert.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const platform = alert.platform || "Kick";
    const content = renderAlert(alert.messageTemplate, stream, alert.slug, true, platform);
    const options = { components: makeComponents(renderAlert(alert.title, stream, alert.slug, true, platform), content, alert.image || stream.thumbnail, alert.color), flags: MessageFlags.IsComponentsV2, allowedMentions: allowedMentionsFor(`${alert.title || ""} ${alert.messageTemplate || ""}`) };
    if (alert.displayName || alert.avatarUrl) {
        if (!state.webhookId || !state.webhookToken) return;
        const webhook = new WebhookClient({ id: state.webhookId, token: state.webhookToken });
        await webhook.editMessage(state.messageId, options);
    } else {
        const message = await channel.messages.fetch(state.messageId).catch(() => null);
        if (!message) return;
        await message.edit(options);
    }
    state.lastViewers = viewers;
    state.lastViewerUpdateAt = new Date();
    await state.save();
}

async function checkAlert(client, alert) {
    let state = await SocialAlertState.findOne({ guildId: alert.guildId, alertId: alert._id });
    if (!state) state = new SocialAlertState({ guildId: alert.guildId, alertId: alert._id, channelId: alert.channelId });
    const platform = alert.platform || "Kick";
    if (state.platform !== platform) {
        state.platform = platform;
        state.lastStreamId = null;
        state.messageId = null;
        state.lastViewers = null;
    }
    if (state.channelId !== alert.channelId) {
        state.channelId = alert.channelId;
        state.messageId = null;
    }
    const channelInfo = platform === "TikTok" ? await getTikTokLiveInfo(alert.slug) : platform === "Twitch" ? await getTwitchLiveInfo(alert.slug) : platform === "YouTube" ? await getYouTubeLiveInfo(alert.slug) : await getKickStream(alert.slug);
    if (platform === "Kick" && !channelInfo) {
        console.warn(`[SOCIALALERTS] Kick ${alert.slug} (${alert.guildId}): la API no devolvió ningún canal para ese nombre.`);
        return;
    }
    const stream = platform === "TikTok" ? channelInfo.stream : channelInfo?.stream;
    // Kick represents an offline channel with a null/missing `stream` object.
    // Some API responses omit `is_live` while returning the active stream.
    if (!stream || stream.is_live === false) {
        console.info(`[SOCIALALERTS] ${platform} ${alert.slug} (${alert.guildId}): consulta correcta, no hay directo activo.`);
        if (state.lastStreamId) {
            state.lastStreamId = null;
            state.messageId = null;
            state.lastViewers = null;
            await state.save();
        }
        return;
    }
    const streamId = String(stream.id || stream.start_time || `${alert.slug}:${stream.stream_title || "live"}`);
    if (streamId !== state.lastStreamId) {
        await sendLiveAlert(client, alert, state, { ...channelInfo, ...stream, stream_title: stream.stream_title || stream.title });
        console.info(`[SOCIALALERTS] ${platform} ${alert.slug} (${alert.guildId}): alerta enviada al canal ${alert.channelId}.`);
        return;
    }
    console.info(`[SOCIALALERTS] ${platform} ${alert.slug} (${alert.guildId}): directo detectado; la alerta ya fue enviada para este directo.`);
    await updateViewerCount(client, alert, state, { ...channelInfo, ...stream, stream_title: stream.stream_title || stream.title });
}

async function poll(client) {
    if (pollRunning) return;
    pollRunning = true;
    try {
        const alerts = await SocialAlert.find({ platform: { $in: ["Kick", "TikTok", "Twitch", "YouTube"] }, enabled: { $ne: false } }).lean();
        console.info(`[SOCIALALERTS] Revisando ${alerts.length} alerta(s) activa(s).`);
        for (const alert of alerts) {
            try { await checkAlert(client, alert); }
            catch (error) {
                const platform = alert.platform || "Kick";
                const missingCredentials = (error.message.startsWith("Faltan ") && error.message.includes("_CLIENT_")) || error.message === "Falta YOUTUBE_API_KEY.";
                if (!missingCredentials || !warnedMissingCredentials.has(platform)) {
                    console.error(`[SOCIALALERTS] ${alert.platform || "Kick"} ${alert.slug} (${alert.guildId}):`, error.message);
                    if (missingCredentials) warnedMissingCredentials.add(platform);
                }
            }
        }
    } catch (error) {
        console.error("[SOCIALALERTS] No pude cargar las alertas sociales:", error.message);
    } finally {
        pollRunning = false;
    }
}

module.exports = function startSocialAlerts(client) {
    console.info("[SOCIALALERTS] Monitor de alertas de Kick, TikTok, Twitch y YouTube iniciado; comprobación cada 60 segundos.");
    setTimeout(() => poll(client), 15_000);
    const timer = setInterval(() => poll(client), POLL_INTERVAL_MS);
    timer.unref?.();
    return timer;
};
