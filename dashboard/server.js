const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { configurations, lists } = require("./modules");
const Poll = require("../Models/Poll");
const PollConfig = require("../Models/PollConfig");
const DashboardAccount = require("../Models/DashboardAccount");
const DashboardReferral = require("../Models/DashboardReferral");
const EconomyUser = require("../Models/EconomyUser");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || 3000;
const requiredEnvironment = [
    "MONGODB_URI",
    "DASHBOARD_SESSION_SECRET",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_BOT_TOKEN"
];
const missingEnvironment = requiredEnvironment.filter(name => !process.env[name]);

if (missingEnvironment.length) {
    console.error(`[Dashboard] Faltan variables de entorno: ${missingEnvironment.join(", ")}`);
    process.exit(1);
}
if (process.env.DASHBOARD_SESSION_SECRET.length < 32) {
    console.error("[Dashboard] DASHBOARD_SESSION_SECRET debe tener al menos 32 caracteres aleatorios.");
    process.exit(1);
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://cdn.discordapp.com", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(express.json({
    limit: "32kb",
    verify: (req, _res, buffer) => {
        if (req.originalUrl === "/integrations/topgg/vote") req.rawBody = Buffer.from(buffer);
    }
}));
app.use(session({
    name: "bryants_dashboard",
    secret: process.env.DASHBOARD_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "dashboardSessions",
        ttl: 60 * 60 * 24 * 7
    }),
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

const publicDirectory = path.join(__dirname, "public");
const birthdayMemberNameCache = new Map();

async function getBirthdayMemberName(guildId, userId) {
    if (!/^\d{17,20}$/.test(String(userId || ""))) return null;
    const cacheKey = `${guildId}:${userId}`;
    const cached = birthdayMemberNameCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.name;

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
            signal: AbortSignal.timeout(8000)
        });
        if (response.status === 404) {
            birthdayMemberNameCache.set(cacheKey, { name: null, expiresAt: Date.now() + 5 * 60_000 });
            return null;
        }
        if (!response.ok) return null;
        const member = await response.json();
        const name = member.user?.global_name || member.nick || member.user?.username || null;
        if (name) birthdayMemberNameCache.set(cacheKey, { name, expiresAt: Date.now() + 60 * 60_000 });
        return name;
    } catch {
        return null;
    }
}

function getRedirectUri() {
    if (process.env.DASHBOARD_REDIRECT_URI) return process.env.DASHBOARD_REDIRECT_URI;
    if (!process.env.APP_URL) return null;
    return new URL("/auth/callback", process.env.APP_URL).toString();
}

function makeOAuthUrl(state) {
    const redirectUri = getRedirectUri();
    if (!redirectUri) throw new Error("Activa una dirección web para la dashboard antes de iniciar sesión.");
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "identify guilds");
    url.searchParams.set("state", state);
    return url.toString();
}

async function discordRequest(url, accessToken) {
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        const error = new Error(`Discord respondió ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

async function refreshOAuthToken(req) {
    if (!req.session.oauth?.refreshToken) return false;
    if (Date.now() < req.session.oauth.expiresAt - 60_000) return true;

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: req.session.oauth.refreshToken,
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET
    });
    const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });
    if (!response.ok) return false;

    const token = await response.json();
    req.session.oauth.accessToken = token.access_token;
    req.session.oauth.refreshToken = token.refresh_token || req.session.oauth.refreshToken;
    req.session.oauth.expiresAt = Date.now() + token.expires_in * 1000;
    return true;
}

function requireLogin(req, res, next) {
    if (!req.session.user || !req.session.oauth) {
        return res.status(401).json({ error: "Inicia sesión con Discord para continuar." });
    }
    return next();
}

function requireCsrf(req, res, next) {
    const supplied = req.get("x-csrf-token") || "";
    const expected = req.session.csrfToken || "";
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    if (!supplied || suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
        return res.status(403).json({ error: "La sesión expiró. Recarga la página e inténtalo de nuevo." });
    }
    return next();
}

async function isAuthorizedGuild(req, guildId) {
    if (!await refreshOAuthToken(req)) return false;

    const cache = req.session.guildAuthorization;
    if (cache?.guildId === guildId && cache.expiresAt > Date.now()) return true;

    const guilds = await discordRequest("https://discord.com/api/v10/users/@me/guilds", req.session.oauth.accessToken);
    const guild = guilds.find(item => item.id === guildId);
    if (!guild) return false;

    let isAdmin = Boolean(guild.owner);
    try {
        isAdmin ||= (BigInt(guild.permissions || guild.permissions_new || "0") & 8n) === 8n;
    } catch {
        return false;
    }
    if (!isAdmin) return false;

    const botResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });
    if (!botResponse.ok) return false;

    req.session.guildAuthorization = { guildId, expiresAt: Date.now() + 30_000 };
    return true;
}

function requireGuildAdmin(req, res, next) {
    if (!req.session.user || !req.session.oauth) {
        return res.status(401).json({ error: "Inicia sesión con Discord para continuar." });
    }
    isAuthorizedGuild(req, req.params.guildId)
        .then(allowed => allowed
            ? next()
            : res.status(403).json({ error: "Necesitas ser administrador del servidor y tener el bot instalado." }))
        .catch(error => {
            console.error("[Dashboard Access] Error al validar servidor:", error.message);
            res.status(502).json({ error: "No pude validar el acceso a este servidor." });
        });
}

function setNested(target, key, value) {
    const parts = key.split(".");
    let cursor = target;
    for (const part of parts.slice(0, -1)) cursor = cursor[part] ||= {};
    cursor[parts.at(-1)] = value;
}

function cleanFields(fields, input, requireAll = false) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("Los datos enviados no tienen un formato válido.");
    }

    const cleaned = {};
    for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(input, field.name)) {
            if (requireAll && !field.optional) throw new Error(`Completa el campo ${field.label}.`);
            continue;
        }
        let value = input[field.name];
        if (field.optional && (value === "" || value === null || value === undefined)) value = null;

        if (field.type === "boolean") {
            if (typeof value !== "boolean") throw new Error(`${field.label} debe ser sí o no.`);
        } else if (field.type === "number") {
            value = Number(value);
            if (!Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) {
                throw new Error(`${field.label} tiene un número fuera del rango permitido.`);
            }
        } else if (field.type === "json") {
            if (typeof value === "string") {
                try { value = JSON.parse(value); } catch { throw new Error(`${field.label} debe tener JSON válido.`); }
            }
            if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field.label} debe ser un objeto JSON.`);
        } else if (field.type === "setups") {
            if (!Array.isArray(value) || value.length > 10) throw new Error("TempVoice acepta hasta 10 configuraciones.");
            value = value.map(setup => {
                const result = {};
                for (const key of ["categoryId", "creatorChannelId", "panelChannelId", "panelMessageId"]) {
                    if (key === "panelMessageId" && (setup[key] == null || setup[key] === "")) {
                        result[key] = null;
                    } else if (typeof setup[key] === "string" && setup[key].length <= 40) {
                        result[key] = setup[key];
                    } else {
                        throw new Error("Cada configuración TempVoice necesita IDs válidos de categoría y canales.");
                    }
                }
                return result;
            });
        } else if (field.type.endsWith("-list")) {
            if (!Array.isArray(value) || value.length > 100 || value.some(item => typeof item !== "string" || item.length > 100)) {
                throw new Error(`${field.label} debe ser una lista válida.`);
            }
        } else if (value !== null) {
            if (typeof value !== "string") throw new Error(`${field.label} debe ser texto.`);
            value = value.trim();
            if (!field.optional && !value) throw new Error(`Completa el campo ${field.label}.`);
            if (field.maxLength && value.length > field.maxLength) throw new Error(`${field.label} supera el máximo de ${field.maxLength} caracteres.`);
            if (field.type === "select" && !field.options.includes(value)) throw new Error(`${field.label} tiene una opción no permitida.`);
            if (field.type === "color" && value && !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${field.label} debe usar formato #RRGGBB.`);
            if (field.type === "url" && value) {
                let url;
                try { url = new URL(value); } catch { throw new Error(`${field.label} no es una URL válida.`); }
                if (url.protocol !== "https:") throw new Error(`${field.label} debe comenzar con https://.`);
            }
        }

        setNested(cleaned, field.name, value);
    }
    const ranges = [["messageXpMin", "messageXpMax"], ["workMin", "workMax"], ["gambleMin", "gambleMax"], ["minAmount", "maxAmount"]];
    for (const [minimum, maximum] of ranges) {
        if (Number.isFinite(cleaned[minimum]) && Number.isFinite(cleaned[maximum]) && cleaned[minimum] > cleaned[maximum]) {
            throw new Error("El valor mínimo no puede superar el máximo.");
        }
    }
    return cleaned;
}

async function fetchGuildResources(guildId) {
    const [channelsResponse, rolesResponse] = await Promise.all([
        fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        }),
        fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        })
    ]);
    if (!channelsResponse.ok || !rolesResponse.ok) throw new Error("No pude consultar los canales y roles de Discord.");
    const [channels, roles] = await Promise.all([channelsResponse.json(), rolesResponse.json()]);
    return { channels, roles };
}

function validatePollInput(input) {
    const question = typeof input?.question === "string" ? input.question.trim() : "";
    if (!question || question.length > 256) throw new Error("La pregunta debe tener entre 1 y 256 caracteres.");
    if (!Array.isArray(input.options)) throw new Error("Escribe las opciones de la encuesta, una por línea.");
    const options = input.options.map(option => typeof option === "string" ? option.trim() : "");
    if (options.length < 2 || options.length > 4 || options.some(option => !option || option.length > 100)) {
        throw new Error("La encuesta necesita entre 2 y 4 opciones de hasta 100 caracteres cada una.");
    }
    if (new Set(options.map(option => option.toLocaleLowerCase("es"))).size !== options.length) {
        throw new Error("Las opciones no pueden repetirse.");
    }
    const duration = Number(input.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 10080) throw new Error("La duración debe estar entre 1 minuto y 7 días.");
    return { question, options, duration };
}

function makePollMessage(question, options, footer) {
    return {
        embeds: [{
            color: 0x8A2BE2,
            title: "📊 Encuesta",
            description: `## ${question}\n\n${options.map((option, index) => `${index + 1}️⃣ ${option.text} — **${option.votes?.length || 0}** votos`).join("\n")}`,
            footer: { text: footer }
        }],
        components: [{
            type: 1,
            components: options.map((option, index) => ({
                type: 2,
                style: 2,
                custom_id: `poll_${index}`,
                label: `${index + 1}`
            }))
        }],
        allowed_mentions: { parse: [] }
    };
}

async function discordBotRequest(url, { method = "GET", body } = {}) {
    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            ...(body ? { "Content-Type": "application/json" } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(12_000)
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(response.status === 429
            ? "Discord está limitando las solicitudes. Espera un momento e inténtalo otra vez."
            : payload?.message || `Discord respondió ${response.status}.`);
        error.status = response.status;
        throw error;
    }
    return payload;
}

async function validateDiscordReferences(guildId, fields, values) {
    const referenceFields = fields.filter(field => ["channel", "voice", "category", "role", "channel-list", "role-list"].includes(field.type));
    if (!referenceFields.length && !fields.some(field => field.type === "setups" && values.setups)) return;

    const { channels, roles } = await fetchGuildResources(guildId);
    const channelTypes = new Map(channels.map(channel => [channel.id, channel.type]));
    const roleIds = new Set(roles.map(role => role.id));
    const expectedTypes = {
        channel: [0, 5, 15, 16],
        "channel-list": [0, 5, 15, 16],
        voice: [2, 13],
        category: [4]
    };

    for (const field of referenceFields) {
        const value = getFieldValue(values, field.name);
        if (value == null || value === "") continue;
        const items = Array.isArray(value) ? value : [value];
        for (const id of items) {
            if (field.type === "role" || field.type === "role-list") {
                if (!roleIds.has(id)) throw new Error(`${field.label} debe ser un rol de este servidor.`);
            } else if (!(field.channelTypes || expectedTypes[field.type]).includes(channelTypes.get(id))) {
                throw new Error(`${field.label} debe ser un canal compatible de este servidor.`);
            }
        }
    }

    const setupsField = fields.find(field => field.type === "setups");
    if (setupsField && Array.isArray(values.setups)) {
        for (const setup of values.setups) {
            if (channelTypes.get(setup.categoryId) !== 4 || !expectedTypes.voice.includes(channelTypes.get(setup.creatorChannelId)) || channelTypes.get(setup.panelChannelId) !== 0) {
                throw new Error("Cada configuración TempVoice debe usar una categoría, un canal creador de voz y un canal de texto de este servidor.");
            }
        }
    }
}

function getFieldValue(values, key) {
    return key.split(".").reduce((cursor, part) => cursor?.[part], values);
}

function serialize(document) {
    if (!document) return null;
    const result = document.toObject({ versionKey: false });
    result._id = String(result._id);
    return result;
}

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.get("/auth/login", (req, res) => {
    if (!getRedirectUri()) return res.status(503).send("Activa la dirección web de FadeHost para continuar.");
    const state = crypto.randomBytes(32).toString("hex");
    req.session.oauthState = state;
    req.session.save(error => {
        if (error) return res.status(500).send("No se pudo iniciar el acceso con Discord.");
        return res.redirect(makeOAuthUrl(state));
    });
});

app.get("/auth/callback", async (req, res) => {
    const { code, state, error } = req.query;
    const expectedState = req.session.oauthState;
    delete req.session.oauthState;

    if (error || !code || !expectedState || state !== expectedState) {
        return res.redirect("/?login=failed");
    }

    try {
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: String(code),
            redirect_uri: getRedirectUri(),
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET
        });
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body
        });
        if (!tokenResponse.ok) throw new Error("Discord rechazó el código OAuth2.");

        const token = await tokenResponse.json();
        const user = await discordRequest("https://discord.com/api/users/@me", token.access_token);
        await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
        req.session.user = {
            id: user.id,
            username: user.global_name || user.username,
            globalName: user.global_name || null,
            avatar: user.avatar
        };
        req.session.oauth = {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + token.expires_in * 1000
        };
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
        return req.session.save(error => error ? res.status(500).send("No se pudo guardar la sesión.") : res.redirect("/"));
    } catch (requestError) {
        console.error("[Dashboard OAuth] Error al iniciar sesión:", requestError.message);
        return res.redirect("/?login=failed");
    }
});

app.get("/api/me", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(req.session.user
        ? { user: req.session.user, csrfToken: req.session.csrfToken }
        : { user: null });
});

const supportedAccountLocales = new Set(["en", "es", "de", "pt", "fr", "pl", "tr", "ru", "it", "nl"]);

app.get("/api/account/settings", requireLogin, async (req, res) => {
    const settings = await DashboardAccount.findOne({ userId: req.session.user.id }).lean();
    return res.json({
        locale: settings?.locale || "es",
        bio: settings?.bio || "",
        links: settings?.links || []
    });
});

app.put("/api/account/settings", requireLogin, requireCsrf, async (req, res) => {
    const { locale, bio, links } = req.body || {};
    const update = {};
    if (locale !== undefined) {
        if (!supportedAccountLocales.has(locale)) return res.status(400).json({ error: "Elige un idioma disponible." });
        update.locale = locale;
    }
    if (bio !== undefined) {
        if (typeof bio !== "string" || bio.length > 2000) return res.status(400).json({ error: "La descripción debe tener como máximo 2.000 caracteres." });
        update.bio = bio.trim();
    }
    if (links !== undefined && (!Array.isArray(links) || links.length > 5)) return res.status(400).json({ error: "Puedes guardar hasta cinco enlaces." });

    const cleanLinks = [];
    for (const link of links || []) {
        if (!link || typeof link.label !== "string" || typeof link.url !== "string") {
            return res.status(400).json({ error: "Revisa los enlaces del perfil." });
        }
        const label = link.label.trim().slice(0, 40);
        const rawUrl = link.url.trim();
        if (!label && !rawUrl) continue;
        if (!label || rawUrl.length > 300) return res.status(400).json({ error: "Cada enlace necesita un nombre y una dirección válida." });
        let parsedUrl;
        try { parsedUrl = new URL(rawUrl); } catch { return res.status(400).json({ error: "Usa una dirección web completa, por ejemplo https://ejemplo.com." }); }
        if (!["https:", "http:"].includes(parsedUrl.protocol)) return res.status(400).json({ error: "Los enlaces solo pueden usar HTTP o HTTPS." });
        cleanLinks.push({ label, url: parsedUrl.toString() });
    }

    if (links !== undefined) update.links = cleanLinks;
    if (!Object.keys(update).length) return res.status(400).json({ error: "No recibí cambios para guardar." });
    const settings = await DashboardAccount.findOneAndUpdate(
        { userId: req.session.user.id },
        { $set: update },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({ ok: true, locale: settings.locale, bio: settings.bio, links: settings.links });
});

const REFERRAL_REWARD = 1000;
const TOPGG_VOTE_REWARD = 250;
const TOPGG_VOTE_COOLDOWN = 12 * 60 * 60 * 1000;

function getReferralRedirectUri() {
    if (process.env.REFERRAL_REDIRECT_URI) return process.env.REFERRAL_REDIRECT_URI;
    if (!process.env.APP_URL) return null;
    return new URL("/referral/callback", process.env.APP_URL).toString();
}

function secureStringEqual(left, right) {
    const leftBuffer = Buffer.from(String(left || ""));
    const rightBuffer = Buffer.from(String(right || ""));
    return leftBuffer.length === rightBuffer.length && leftBuffer.length > 0 && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function renderReferralResult(res, status) {
    return res.redirect(`/referral-result.html?status=${encodeURIComponent(status)}`);
}

app.get("/api/account/rewards", requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    let account = await DashboardAccount.findOne({ userId });
    if (!account) account = await DashboardAccount.create({ userId });
    if (!account.referralCode) {
        for (let attempt = 0; attempt < 3 && !account.referralCode; attempt++) {
            account.referralCode = crypto.randomBytes(7).toString("base64url");
            try { await account.save(); }
            catch (error) {
                if (error.code !== 11000) throw error;
                account = await DashboardAccount.findOne({ userId });
                if (!account.referralCode) account.referralCode = undefined;
            }
        }
        if (!account.referralCode) return res.status(503).json({ error: "No pude crear tu enlace de referido. Inténtalo de nuevo." });
    }
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    return res.json({
        referralCount: account.referralCount || 0,
        voteCount: account.voteCount || 0,
        referralUrl: new URL(`/invite/${account.referralCode}`, baseUrl).toString(),
        referralReward: REFERRAL_REWARD,
        voteReward: TOPGG_VOTE_REWARD,
        voteConfigured: Boolean(process.env.TOPGG_WEBHOOK_SECRET && process.env.TOPGG_REWARD_GUILD_ID),
        referralConfigured: Boolean(getReferralRedirectUri()),
        voteRewardGuildId: process.env.TOPGG_REWARD_GUILD_ID || null,
        topggUrl: `https://top.gg/bot/${encodeURIComponent(process.env.DISCORD_CLIENT_ID)}/vote`
    });
});

app.get("/invite/:referralCode", async (req, res) => {
    const referrer = await DashboardAccount.findOne({ referralCode: req.params.referralCode }).select("userId referralCode").lean();
    if (!referrer) return renderReferralResult(res, "invalid");
    const redirectUri = getReferralRedirectUri();
    if (!redirectUri) return renderReferralResult(res, "unavailable");

    const state = crypto.randomBytes(24).toString("hex");
    req.session.referralInstall = { state, referralCode: referrer.referralCode, createdAt: Date.now() };
    return req.session.save(error => {
        if (error) return renderReferralResult(res, "unavailable");
        const url = new URL("https://discord.com/oauth2/authorize");
        url.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("scope", "identify bot applications.commands");
        url.searchParams.set("permissions", process.env.DISCORD_BOT_PERMISSIONS || "8");
        url.searchParams.set("integration_type", "0");
        url.searchParams.set("state", state);
        return res.redirect(url.toString());
    });
});

app.get("/referral/callback", async (req, res) => {
    const saved = req.session.referralInstall;
    delete req.session.referralInstall;
    if (!saved || Date.now() - saved.createdAt > 2 * 60 * 60_000 || !secureStringEqual(req.query.state, saved.state) || !req.query.code) {
        return renderReferralResult(res, "invalid");
    }
    try {
        const redirectUri = getReferralRedirectUri();
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: String(req.query.code),
                redirect_uri: redirectUri,
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET
            })
        });
        if (!tokenResponse.ok) throw new Error("Discord rechazó el flujo de instalación.");
        const token = await tokenResponse.json();
        const [installer, guildId] = await Promise.all([
            discordRequest("https://discord.com/api/v10/users/@me", token.access_token),
            Promise.resolve(String(req.query.guild_id || ""))
        ]);
        if (!/^\d{17,20}$/.test(guildId)) return renderReferralResult(res, "not-added");

        const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${process.env.DISCORD_CLIENT_ID}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
            signal: AbortSignal.timeout(8000)
        });
        if (!memberResponse.ok) return renderReferralResult(res, "not-added");
        const botMember = await memberResponse.json();
        const joinedAt = Date.parse(botMember.joined_at || "");
        if (!Number.isFinite(joinedAt) || Date.now() - joinedAt > 60 * 60_000 || joinedAt > Date.now() + 60_000) {
            return renderReferralResult(res, "not-new");
        }

        const referrer = await DashboardAccount.findOne({ referralCode: saved.referralCode }).select("userId").lean();
        if (!referrer || referrer.userId === installer.id) return renderReferralResult(res, "self");

        const databaseSession = await mongoose.startSession();
        let credited = false;
        try {
            await databaseSession.withTransaction(async () => {
                const priorReferral = await DashboardReferral.exists({ inviteeId: installer.id }).session(databaseSession);
                if (priorReferral) return;
                await DashboardReferral.create([{
                    referrerId: referrer.userId,
                    inviteeId: installer.id,
                    guildId,
                    reward: REFERRAL_REWARD
                }], { session: databaseSession });
                await EconomyUser.findOneAndUpdate(
                    { guildId, userId: referrer.userId },
                    { $inc: { wallet: REFERRAL_REWARD }, $setOnInsert: { guildId, userId: referrer.userId } },
                    { upsert: true, new: true, session: databaseSession }
                );
                await DashboardAccount.updateOne(
                    { userId: referrer.userId },
                    { $inc: { referralCount: 1 } },
                    { session: databaseSession }
                );
                credited = true;
            });
        } finally {
            await databaseSession.endSession();
        }
        return renderReferralResult(res, credited ? "credited" : "duplicate");
    } catch (error) {
        console.error("[Dashboard Referrals] No se pudo confirmar el referido:", error.message);
        if (error.code === 11000) return renderReferralResult(res, "duplicate");
        return renderReferralResult(res, "error");
    }
});

app.post("/integrations/topgg/vote", async (req, res) => {
    const secret = process.env.TOPGG_WEBHOOK_SECRET;
    if (!secret || !process.env.TOPGG_REWARD_GUILD_ID) return res.status(503).json({ error: "Recompensas de Top.gg sin configurar." });

    const authorization = String(req.get("authorization") || "");
    let authorized = secureStringEqual(authorization, secret)
        || (authorization.startsWith("Bearer ") && secureStringEqual(authorization.slice(7), secret));
    const signature = req.get("x-topgg-signature");
    if (!authorized && signature && req.rawBody) {
        const parts = Object.fromEntries(signature.split(",").map(part => part.trim().split("=")));
        const timestamp = Number(parts.t);
        if (Number.isFinite(timestamp) && Math.abs(Date.now() / 1000 - timestamp) <= 300 && parts.v1) {
            const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.`).update(req.rawBody).digest("hex");
            authorized = secureStringEqual(expected, parts.v1);
        }
    }
    if (!authorized) return res.status(401).json({ error: "Firma de Top.gg no válida." });

    const vote = req.body?.vote || req.body;
    const userId = String(vote?.user || vote?.userId || "");
    if (vote?.type === "test") return res.json({ ok: true, ignored: "test" });
    const votedBotId = vote?.bot || vote?.botId;
    if (votedBotId && String(votedBotId) !== String(process.env.DISCORD_CLIENT_ID)) return res.status(400).json({ error: "El voto no corresponde a este bot." });
    if (!/^\d{17,20}$/.test(userId)) return res.status(400).json({ error: "El voto no incluye un ID de usuario válido." });

    const now = new Date();
    const cutoff = new Date(now.getTime() - TOPGG_VOTE_COOLDOWN);
    const amount = TOPGG_VOTE_REWARD;
    const guildId = process.env.TOPGG_REWARD_GUILD_ID;
    const databaseSession = await mongoose.startSession();
    let credited = false;
    try {
        await databaseSession.withTransaction(async () => {
            await DashboardAccount.updateOne({ userId }, { $setOnInsert: { userId } }, { upsert: true, session: databaseSession });
            const account = await DashboardAccount.findOneAndUpdate(
                { userId, $or: [{ lastVoteAt: null }, { lastVoteAt: { $lte: cutoff } }] },
                { $set: { lastVoteAt: now }, $inc: { voteCount: 1 } },
                { new: true, session: databaseSession }
            );
            if (!account) return;
            await EconomyUser.findOneAndUpdate(
                { guildId, userId },
                { $inc: { wallet: amount }, $setOnInsert: { guildId, userId } },
                { upsert: true, new: true, session: databaseSession }
            );
            credited = true;
        });
    } catch (error) {
        console.error("[Dashboard Top.gg] No se pudo acreditar el voto:", error.message);
        return res.status(500).json({ error: "No se pudo acreditar el voto." });
    } finally {
        await databaseSession.endSession();
    }
    return res.json({ ok: true, credited });
});

app.get("/api/guilds", requireLogin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        if (!await refreshOAuthToken(req)) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: "La sesión de Discord venció. Vuelve a iniciar sesión." });
        }

        const guilds = await discordRequest("https://discord.com/api/v10/users/@me/guilds", req.session.oauth.accessToken);
        const adminGuilds = guilds.filter(guild => {
            if (guild.owner) return true;
            try {
                return (BigInt(guild.permissions || guild.permissions_new || "0") & 8n) === 8n;
            } catch {
                return false;
            }
        });

        const availableGuilds = await Promise.all(adminGuilds.map(async guild => {
            try {
                const response = await fetch(`https://discord.com/api/v10/guilds/${guild.id}`, {
                    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
                });
                if (!response.ok) return null;
                return {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon
                        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                        : null
                };
            } catch {
                return null;
            }
        }));

        return res.json({ guilds: availableGuilds.filter(Boolean) });
    } catch (error) {
        console.error("[Dashboard Guilds] Error al cargar servidores:", error.message);
        return res.status(502).json({ error: "No pude consultar tus servidores en Discord. Inténtalo de nuevo." });
    }
});

app.get("/api/guilds/:guildId/resources", requireGuildAdmin, async (req, res) => {
    try {
        const { channels, roles } = await fetchGuildResources(req.params.guildId);
        return res.json({
            channels: channels.map(({ id, name, type, parent_id }) => ({ id, name, type, parentId: parent_id })),
            roles: roles.filter(role => !role.managed && role.name !== "@everyone").map(({ id, name, color }) => ({ id, name, color }))
        });
    } catch (error) {
        console.error("[Dashboard Resources] Error al cargar canales y roles:", error.message);
        return res.status(502).json({ error: "No pude cargar los canales y roles del servidor." });
    }
});

app.get("/api/guilds/:guildId/birthday-members/names", requireGuildAdmin, async (req, res) => {
    try {
        const Birthday = lists.birthdayMembers.model;
        const records = await Birthday.find({ guildId: req.params.guildId }).select("userId").lean();
        const userIds = [...new Set(records.map(record => String(record.userId || "")).filter(id => /^\d{17,20}$/.test(id)))];
        const names = {};
        let next = 0;
        const workers = Array.from({ length: Math.min(3, userIds.length) }, async () => {
            while (next < userIds.length) {
                const userId = userIds[next++];
                const name = await getBirthdayMemberName(req.params.guildId, userId);
                if (name) names[userId] = name;
            }
        });
        await Promise.all(workers);
        return res.json({ names });
    } catch (error) {
        console.error("[Dashboard Birthdays] Error al cargar nombres:", error.message);
        return res.status(500).json({ error: "No pude cargar los nombres de los miembros." });
    }
});

app.get("/api/guilds/:guildId/config", requireGuildAdmin, async (req, res) => {
    try {
        const configResults = await Promise.all(Object.entries(configurations).map(async ([key, definition]) => {
            const document = await definition.model.findOne({ [definition.guildField]: req.params.guildId });
            const data = document?.toObject();
            return [key, data ? { ...data, _id: String(data._id), configured: true } : { configured: false }];
        }));
        const listResults = await Promise.all(Object.entries(lists).map(async ([key, definition]) => {
            const data = await definition.model.find({ guildId: req.params.guildId }).lean();
            return [key, data.map(item => ({ ...item, _id: String(item._id) }))];
        }));
        return res.json({
            configurations: Object.fromEntries(configResults),
            lists: Object.fromEntries(listResults),
            modules: {
                configurations: Object.fromEntries(Object.entries(configurations).map(([key, value]) => [key, { title: value.title, category: value.category, description: value.description, fields: value.fields }])),
                lists: Object.fromEntries(Object.entries(lists).map(([key, value]) => [key, { title: value.title, category: value.category, fields: value.fields }]))
            }
        });
    } catch (error) {
        console.error("[Dashboard Config] Error al leer configuración:", error.message);
        return res.status(500).json({ error: "No pude leer la configuración de este servidor." });
    }
});

app.put("/api/guilds/:guildId/config/:module", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    const definition = configurations[req.params.module];
    if (!definition) return res.status(404).json({ error: "No encontré ese sistema." });
    try {
        const update = cleanFields(definition.fields, req.body);
        if (!Object.keys(update).length) return res.status(400).json({ error: "No hay cambios para guardar." });
        await validateDiscordReferences(req.params.guildId, definition.fields, update);
        const document = await definition.model.findOneAndUpdate(
            { [definition.guildField]: req.params.guildId },
            { $set: update, $setOnInsert: { [definition.guildField]: req.params.guildId } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        return res.json({ configuration: serialize(document) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: "Este sistema ya tiene una configuración duplicada. Revísala desde Discord." });
        return res.status(400).json({ error: error.message || "No pude guardar la configuración." });
    }
});

app.get("/api/guilds/:guildId/polls", requireGuildAdmin, async (req, res) => {
    try {
        const [pollConfig, polls] = await Promise.all([
            PollConfig.findOne({ guildId: req.params.guildId }).lean(),
            Poll.find({ guildId: req.params.guildId }).sort({ createdAt: -1 }).lean()
        ]);
        return res.json({
            configuredChannelId: pollConfig?.channelId || null,
            polls: polls.map(poll => ({
                _id: String(poll._id),
                channelId: poll.channelId,
                messageId: poll.messageId,
                question: poll.question,
                options: (poll.options || []).map(option => ({ id: option.id, text: option.text, voteCount: option.votes?.length || 0 })),
                ended: Boolean(poll.ended),
                endAt: poll.endAt || null,
                createdAt: poll.createdAt || null,
                url: poll.channelId && poll.messageId ? `https://discord.com/channels/${req.params.guildId}/${poll.channelId}/${poll.messageId}` : null
            }))
        });
    } catch (error) {
        console.error("[Dashboard Polls] Error al cargar encuestas:", error.message);
        return res.status(500).json({ error: "No pude cargar las encuestas del servidor." });
    }
});

app.post("/api/guilds/:guildId/polls", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    let sentMessage;
    try {
        const pollConfig = await PollConfig.findOne({ guildId: req.params.guildId }).lean();
        if (!pollConfig?.channelId) return res.status(400).json({ error: "Primero elige y guarda el canal de encuestas." });
        const { question, options: optionTexts, duration } = validatePollInput(req.body);
        const options = optionTexts.map((text, index) => ({ id: String(index), text, votes: [] }));
        const endAt = new Date(Date.now() + duration * 60_000);
        sentMessage = await discordBotRequest(`https://discord.com/api/v10/channels/${pollConfig.channelId}/messages`, {
            method: "POST",
            body: makePollMessage(question, options, `Termina en ${duration} minutos`)
        });
        const poll = await Poll.create({
            guildId: req.params.guildId,
            channelId: pollConfig.channelId,
            messageId: sentMessage.id,
            creatorId: req.session.user.id,
            question,
            options,
            endAt
        });
        return res.status(201).json({ poll: serialize(poll), url: `https://discord.com/channels/${req.params.guildId}/${pollConfig.channelId}/${sentMessage.id}` });
    } catch (error) {
        if (sentMessage?.id) await discordBotRequest(`https://discord.com/api/v10/channels/${sentMessage.channel_id || ""}/messages/${sentMessage.id}`, { method: "DELETE" }).catch(() => {});
        const status = error.status === 429 ? 429 : error.message?.startsWith("La ") || error.message?.startsWith("Escribe ") || error.message?.startsWith("Las ") ? 400 : 502;
        return res.status(status).json({ error: error.message || "No pude publicar la encuesta." });
    }
});

app.put("/api/guilds/:guildId/polls/:pollId", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    try {
        const poll = await Poll.findOne({ _id: req.params.pollId, guildId: req.params.guildId });
        if (!poll) return res.status(404).json({ error: "No encontré esa encuesta." });
        if (poll.ended) return res.status(409).json({ error: "Las encuestas terminadas no se pueden editar." });
        const { question, options: optionTexts, duration } = validatePollInput(req.body);
        const optionsUnchanged = optionTexts.length === poll.options.length && optionTexts.every((text, index) => text === poll.options[index].text);
        const options = optionTexts.map((text, index) => ({
            id: String(index),
            text,
            votes: optionsUnchanged ? [...(poll.options[index].votes || [])] : []
        }));
        const endAt = new Date(Date.now() + duration * 60_000);
        await discordBotRequest(`https://discord.com/api/v10/channels/${poll.channelId}/messages/${poll.messageId}`, {
            method: "PATCH",
            body: makePollMessage(question, options, `Termina en ${duration} minutos`)
        });
        poll.question = question;
        poll.options = options;
        poll.endAt = endAt;
        await poll.save();
        return res.json({ ok: true });
    } catch (error) {
        console.error("[Dashboard Polls] Error al editar encuesta:", error.message);
        const status = error.status === 404 ? 404 : error.status === 429 ? 429 : error.status ? 502 : 400;
        return res.status(status).json({ error: error.message || "No pude actualizar la encuesta." });
    }
});

app.delete("/api/guilds/:guildId/polls/:pollId", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    try {
        const poll = await Poll.findOne({ _id: req.params.pollId, guildId: req.params.guildId });
        if (!poll) return res.status(404).json({ error: "No encontré esa encuesta." });
        try {
            await discordBotRequest(`https://discord.com/api/v10/channels/${poll.channelId}/messages/${poll.messageId}`, { method: "DELETE" });
        } catch (error) {
            if (error.status !== 404) throw error;
        }
        await Poll.deleteOne({ _id: poll._id, guildId: req.params.guildId });
        return res.json({ ok: true });
    } catch (error) {
        console.error("[Dashboard Polls] Error al eliminar encuesta:", error.message);
        const status = error.status === 429 ? 429 : error.status ? 502 : 500;
        return res.status(status).json({ error: error.message || "No pude eliminar la encuesta." });
    }
});

app.post("/api/guilds/:guildId/lists/:list", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    const definition = lists[req.params.list];
    if (!definition) return res.status(404).json({ error: "No encontré esa lista." });
    try {
        const data = cleanFields(definition.fields, req.body, true);
        if (definition.identity && !data[definition.identity]) return res.status(400).json({ error: "Completa el campo identificador." });
        await validateDiscordReferences(req.params.guildId, definition.fields, data);
        if (definition.identity && await definition.model.exists({ guildId: req.params.guildId, [definition.identity]: data[definition.identity] })) {
            return res.status(409).json({ error: "Ya existe un elemento con ese identificador." });
        }
        const document = await definition.model.create({ ...data, guildId: req.params.guildId });
        return res.status(201).json({ item: serialize(document) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: "Ya existe un elemento con ese identificador." });
        return res.status(400).json({ error: error.message || "No pude añadir este elemento." });
    }
});

app.put("/api/guilds/:guildId/lists/:list/:recordId", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    const definition = lists[req.params.list];
    if (!definition) return res.status(404).json({ error: "No encontré esa lista." });
    try {
        const data = cleanFields(definition.fields, req.body);
        await validateDiscordReferences(req.params.guildId, definition.fields, data);
        if (definition.identity && data[definition.identity] !== undefined && await definition.model.exists({
            guildId: req.params.guildId,
            [definition.identity]: data[definition.identity],
            _id: { $ne: req.params.recordId }
        })) return res.status(409).json({ error: "Ya existe otro elemento con ese identificador." });
        const item = await definition.model.findOneAndUpdate(
            { _id: req.params.recordId, guildId: req.params.guildId },
            { $set: data },
            { new: true, runValidators: true }
        );
        return item ? res.json({ item: serialize(item) }) : res.status(404).json({ error: "No encontré este elemento." });
    } catch (error) {
        return res.status(400).json({ error: error.message || "No pude guardar este elemento." });
    }
});

app.delete("/api/guilds/:guildId/lists/:list/:recordId", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    const definition = lists[req.params.list];
    if (!definition) return res.status(404).json({ error: "No encontré esa lista." });
    const removed = await definition.model.findOneAndDelete({ _id: req.params.recordId, guildId: req.params.guildId });
    return removed ? res.json({ ok: true }) : res.status(404).json({ error: "No encontré este elemento." });
});

app.get("/dashboard/:guildId", async (req, res) => {
    if (!req.session.user || !req.session.oauth) return res.redirect("/");
    try {
        if (!await isAuthorizedGuild(req, req.params.guildId)) return res.status(403).send("No tienes acceso administrativo a este servidor.");
        return res.sendFile(path.join(publicDirectory, "server.html"));
    } catch {
        return res.status(502).send("No pude comprobar el acceso al servidor. Vuelve a intentarlo.");
    }
});

app.get("/settings", (req, res) => {
    if (!req.session.user || !req.session.oauth) return res.redirect("/");
    return res.sendFile(path.join(publicDirectory, "account.html"));
});

app.post("/auth/logout", requireLogin, requireCsrf, (req, res) => {
    req.session.destroy(error => {
        if (error) return res.status(500).json({ error: "No se pudo cerrar la sesión." });
        res.clearCookie("bryants_dashboard", { httpOnly: true, sameSite: "lax", secure: isProduction });
        return res.json({ ok: true });
    });
});

app.use(express.static(publicDirectory, {
    extensions: ["html"],
    index: "index.html",
    maxAge: isProduction ? "1h" : 0
}));

app.use((error, _req, res, _next) => {
    console.error("[Dashboard] Error inesperado:", error);
    return res.status(500).json({ error: "Ocurrió un error interno." });
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => app.listen(port, "0.0.0.0", () => {
        console.log(`[Dashboard] Escuchando en el puerto ${port}.`);
    }))
    .catch(error => {
        console.error("[Dashboard] No pude conectar con MongoDB:", error.message);
        process.exit(1);
    });
