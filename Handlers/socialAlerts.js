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
let pollRunning = false;
let warnedMissingCredentials = false;

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

function renderAlert(template, stream, slug, includeViewerCount) {
    const values = {
        channel: escapePlatformText(stream.broadcaster?.username || stream.channel?.slug || slug),
        title: escapePlatformText(stream.stream_title || stream.title || "En directo"),
        viewers: includeViewerCount ? Number(stream.viewer_count || 0).toLocaleString("es") : "",
        category: escapePlatformText(stream.category?.name || ""),
        url: `https://kick.com/${encodeURIComponent(slug)}`
    };
    return String(template || "").replace(/\{\{(channel|title|viewers|category|url)\}\}/gi, (_match, token) => values[token.toLowerCase()] ?? "").slice(0, 2000);
}

function makeComponents(title, content, image, color) {
    const panel = new ContainerBuilder();
    const parsedColor = /^#[0-9a-f]{6}$/i.test(color || "") ? Number.parseInt(color.slice(1), 16) : 0x53FC18;
    panel.setAccentColor(parsedColor);
    if (image) panel.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)));
    panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title || "🔴 Directo en Kick"}`));
    panel.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(content || "Canal en directo."));
    return [panel];
}

function allowedMentionsFor(template) {
    return { parse: /@(everyone|here)/i.test(template) ? ["everyone"] : [], users: [], roles: [] };
}

async function getStream(slug) {
    const url = new URL("https://api.kick.com/public/v1/channels");
    url.searchParams.set("slug", slug);
    const payload = await kickRequest(url);
    return payload?.data?.[0] || null;
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
    const content = renderAlert(alert.messageTemplate, stream, alert.slug, alert.includeViewerCount);
    const options = {
        components: makeComponents(renderAlert(alert.title, stream, alert.slug, alert.includeViewerCount), content, alert.image, alert.color),
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: allowedMentionsFor(`${alert.title || ""} ${alert.messageTemplate || ""}`)
    };
    let message;
    if (alert.displayName || alert.avatarUrl) {
        const webhook = await ensureWebhook(channel, state, alert);
        message = await webhook.send({ ...options, username: alert.displayName || `Kick · ${alert.slug}`, avatarURL: alert.avatarUrl || undefined });
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
    const content = renderAlert(alert.messageTemplate, stream, alert.slug, true);
    const options = { components: makeComponents(renderAlert(alert.title, stream, alert.slug, true), content, alert.image, alert.color), flags: MessageFlags.IsComponentsV2, allowedMentions: allowedMentionsFor(`${alert.title || ""} ${alert.messageTemplate || ""}`) };
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
    if (state.channelId !== alert.channelId) {
        state.channelId = alert.channelId;
        state.messageId = null;
    }
    const channelInfo = await getStream(alert.slug);
    const stream = channelInfo?.stream;
    // Kick represents an offline channel with a null/missing `stream` object.
    // Some API responses omit `is_live` while returning the active stream.
    if (!stream || stream.is_live === false) {
        if (state.lastStreamId) {
            state.lastStreamId = null;
            state.messageId = null;
            state.lastViewers = null;
            await state.save();
        }
        return;
    }
    const streamId = String(stream.id || stream.start_time || `${alert.slug}:${channelInfo.stream_title || "live"}`);
    if (streamId !== state.lastStreamId) {
        await sendLiveAlert(client, alert, state, { ...channelInfo, ...stream, stream_title: channelInfo.stream_title || stream.title });
        console.info(`[SocialAlerts] Kick ${alert.slug} (${alert.guildId}): alerta enviada al canal ${alert.channelId}.`);
        return;
    }
    await updateViewerCount(client, alert, state, { ...channelInfo, ...stream, stream_title: channelInfo.stream_title || stream.title });
}

async function poll(client) {
    if (pollRunning) return;
    pollRunning = true;
    try {
        const alerts = await SocialAlert.find({ platform: "Kick", enabled: true }).lean();
        for (const alert of alerts) {
            try { await checkAlert(client, alert); }
            catch (error) {
                if (!warnedMissingCredentials || !/KICK_CLIENT_ID|KICK_CLIENT_SECRET/.test(error.message)) {
                    console.error(`[SocialAlerts] Kick ${alert.slug} (${alert.guildId}):`, error.message);
                    if (/KICK_CLIENT_ID|KICK_CLIENT_SECRET/.test(error.message)) warnedMissingCredentials = true;
                }
            }
        }
    } catch (error) {
        console.error("[SocialAlerts] No pude cargar las alertas sociales:", error.message);
    } finally {
        pollRunning = false;
    }
}

module.exports = function startSocialAlerts(client) {
    console.info("[SocialAlerts] Monitor de alertas de Kick iniciado; comprobación cada 60 segundos.");
    setTimeout(() => poll(client), 15_000);
    const timer = setInterval(() => poll(client), POLL_INTERVAL_MS);
    timer.unref?.();
    return timer;
};
