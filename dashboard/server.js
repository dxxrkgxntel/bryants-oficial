const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
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
const DashboardAuditLog = require("../Models/DashboardAuditLog");
const EconomyUser = require("../Models/EconomyUser");
const Level = require("../Models/Level");
const SocialAlertState = require("../Models/SocialAlertState");
const PersonalStatsDaily = require("../Models/PersonalStatsDaily");

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
            imgSrc: ["'self'", "data:", "blob:", "https://cdn.discordapp.com", "https:"],
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
const kickChannelSearchCache = new Map();

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

async function refreshDashboardUsername(req) {
    if (!req.session.user || !req.session.oauth || (req.session.usernameVerified && Date.now() - (req.session.usernameVerifiedAt || 0) < 6 * 60 * 60_000)) return;
    try {
        if (!await refreshOAuthToken(req)) return;
        const user = await discordRequest("https://discord.com/api/v10/users/@me", req.session.oauth.accessToken);
        if (user.id !== req.session.user.id || !user.username) return;
        req.session.user.username = user.username;
        req.session.user.globalName = user.global_name || null;
        req.session.user.displayName = user.global_name || user.username;
        req.session.usernameVerified = true;
        req.session.usernameVerifiedAt = Date.now();
    } catch (error) {
        console.warn("[Dashboard Identity] No pude actualizar el nombre de usuario de Discord:", error.message);
    }
}

async function recordDashboardAudit(req, guildId, action) {
    try {
        await refreshDashboardUsername(req);
        await DashboardAuditLog.create({
            guildId,
            actorId: req.session.user.id,
            actorUsername: req.session.usernameVerified ? req.session.user.username : null,
            action: String(action).slice(0, 160)
        });
    } catch (error) {
        console.error("[Dashboard Audit] No pude guardar el registro:", error.message);
    }
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
        if (field.type === "section") continue;
        if (!Object.prototype.hasOwnProperty.call(input, field.name)) {
            if (requireAll && !field.optional) throw new Error(`Completa el campo ${field.label}.`);
            continue;
        }
        let value = input[field.name];
        if (field.optional && (value === "" || value === null || value === undefined)) value = null;
        if (field.optional && value === null) {
            setNested(cleaned, field.name, null);
            continue;
        }

        if (field.type === "boolean") {
            if (typeof value !== "boolean") throw new Error(`${field.label} debe ser sí o no.`);
        } else if (field.type === "number") {
            if (typeof value === "string" && value.trim() === "") {
                throw new Error(`${field.label} debe contener un número.`);
            }
            value = Number(value);
            if (!Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) {
                throw new Error(`${field.label} tiene un número fuera del rango permitido.`);
            }
        } else if (field.type === "json") {
            if (typeof value === "string") {
                try { value = JSON.parse(value); } catch { throw new Error(`${field.label} debe tener JSON válido.`); }
            }
            if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field.label} debe ser un objeto JSON.`);
        } else if (field.type === "buttons") {
            if (!Array.isArray(value) || value.length > 5) throw new Error(`${field.label} admite hasta cinco botones.`);
            value = value.map(button => {
                if (!button || typeof button !== "object" || Array.isArray(button)) throw new Error(`${field.label} contiene un botón inválido.`);
                const action = button.action;
                const label = typeof button.label === "string" ? button.label.trim() : "";
                const emoji = typeof button.emoji === "string" ? button.emoji.trim() : "";
                if (!label || label.length > 80) throw new Error("Cada botón necesita un nombre de hasta 80 caracteres.");
                if (emoji.length > 100) throw new Error("El emoji del botón es demasiado largo.");
                if (emoji.startsWith("<") && !/^<a?:[a-zA-Z0-9_]{2,32}:\d{17,20}>$/.test(emoji)) throw new Error("Usa un emoji personalizado válido, como <:nombre:id>.");
                if (action === "link") {
                    let url;
                    if (String(button.url || "").trim().length > 2048) throw new Error("La URL del botón supera el máximo de 2.048 caracteres.");
                    try { url = new URL(String(button.url || "").trim()); } catch { throw new Error("Cada botón de enlace necesita una URL válida."); }
                    if (url.protocol !== "https:") throw new Error("Los enlaces de botones deben comenzar con https://.");
                    return { label, emoji, action, url: url.toString() };
                }
                if (action === "role") {
                    const roleId = String(button.roleId || "").trim();
                    if (!/^\d{17,20}$/.test(roleId)) throw new Error("Selecciona un rol válido para cada botón de reclamación.");
                    return { label, emoji, action, roleId };
                }
                throw new Error("Elige si cada botón abre un enlace o reclama un rol.");
            });
        } else if (field.type === "setups") {
            if (!Array.isArray(value) || value.length > 10) throw new Error("TempVoice acepta hasta 10 configuraciones.");
            value = value.map(setup => {
                if (!setup || typeof setup !== "object" || Array.isArray(setup)) {
                    throw new Error("Cada configuración TempVoice debe ser un objeto válido.");
                }
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
            if (!Array.isArray(value) || value.length > (field.maxItems || 100) || value.some(item => typeof item !== "string" || item.length > 100)) {
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

async function fetchBotChannelPermissions(guildId, channels, roles) {
    const bot = await discordBotRequest("https://discord.com/api/v10/users/@me");
    const member = await discordBotRequest(`https://discord.com/api/v10/guilds/${guildId}/members/${bot.id}`);
    const roleMap = new Map(roles.map(role => [role.id, role]));
    const memberRoles = new Set([guildId, ...(member.roles || [])]);
    let basePermissions = 0n;

    for (const roleId of memberRoles) {
        const role = roleMap.get(roleId);
        if (!role) continue;
        try { basePermissions |= BigInt(role.permissions || "0"); } catch { /* Ignore malformed permission values. */ }
    }

    const administrator = (basePermissions & (1n << 3n)) !== 0n;
    const manageRoles = administrator || (basePermissions & (1n << 28n)) !== 0n;
    const botHighestRolePosition = Math.max(0, ...[...memberRoles].map(roleId => roleMap.get(roleId)?.position || 0));
    const unmanageableRoles = roles
        .filter(role => role.id !== guildId && !role.managed && role.position >= botHighestRolePosition)
        .map(({ id, name, position }) => ({ id, name, position }));
    const allPermissions = (1n << 53n) - 1n;
    const permissionBits = {
        manageChannels: 1n << 4n,
        viewChannel: 1n << 10n,
        sendMessages: 1n << 11n,
        embedLinks: 1n << 14n,
        attachFiles: 1n << 15n,
        connect: 1n << 20n,
        speak: 1n << 21n
    };

    const channelPermissions = channels.map(channel => {
        let permissions = administrator ? allPermissions : basePermissions;
        if (!administrator) {
            const overwrites = channel.permission_overwrites || [];
            const everyoneOverwrite = overwrites.find(overwrite => overwrite.type === 0 && overwrite.id === guildId);
            if (everyoneOverwrite) {
                try {
                    permissions &= ~BigInt(everyoneOverwrite.deny || "0");
                    permissions |= BigInt(everyoneOverwrite.allow || "0");
                } catch { /* Ignore malformed overwrite values. */ }
            }

            let roleAllow = 0n;
            let roleDeny = 0n;
            for (const overwrite of overwrites) {
                if (overwrite.type !== 0 || overwrite.id === guildId || !memberRoles.has(overwrite.id)) continue;
                try {
                    roleAllow |= BigInt(overwrite.allow || "0");
                    roleDeny |= BigInt(overwrite.deny || "0");
                } catch { /* Ignore malformed overwrite values. */ }
            }
            permissions &= ~roleDeny;
            permissions |= roleAllow;

            const memberOverwrite = overwrites.find(overwrite => overwrite.type === 1 && overwrite.id === bot.id);
            if (memberOverwrite) {
                try {
                    permissions &= ~BigInt(memberOverwrite.deny || "0");
                    permissions |= BigInt(memberOverwrite.allow || "0");
                } catch { /* Ignore malformed overwrite values. */ }
            }
        }

        const effective = {};
        for (const [name, bit] of Object.entries(permissionBits)) effective[name] = (permissions & bit) === bit;
        return { id: channel.id, type: channel.type, ...effective };
    });
    return { channels: channelPermissions, roleManagement: { canManageRoles: manageRoles, botHighestRolePosition, unmanageableRoles } };
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
    const buttonFields = fields.filter(field => field.type === "buttons");
    if (!referenceFields.length && !buttonFields.length && !fields.some(field => field.type === "setups" && values.setups)) return;

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

    for (const field of buttonFields) {
        const buttons = getFieldValue(values, field.name);
        for (const button of Array.isArray(buttons) ? buttons : []) {
            if (button.action === "role" && !roleIds.has(button.roleId)) {
                throw new Error(`${field.label}: el rol debe pertenecer a este servidor.`);
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

app.get("/api/public/status", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    if (publicStatusCache && Date.now() - publicStatusCache.cachedAt < PUBLIC_STATUS_CACHE_TTL) {
        return res.json(publicStatusCache.payload);
    }

    let databaseStatus = "operational";
    if (mongoose.connection.readyState !== 1) databaseStatus = "degraded";

    let discordStatus = "operational";
    try {
        const response = await fetch("https://discord.com/api/v10/users/@me", {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) discordStatus = response.status === 401 || response.status === 403 ? "down" : "degraded";
    } catch {
        discordStatus = "degraded";
    }

    const payload = {
        checkedAt: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        components: [
            { id: "web", name: "Dashboard web", status: "operational", description: "El servidor web está respondiendo a esta solicitud." },
            { id: "database", name: "Base de datos", status: databaseStatus, description: databaseStatus === "operational" ? "La conexión de MongoDB está activa." : "La conexión de MongoDB no figura como activa." },
            { id: "discord", name: "API de Discord", status: discordStatus, description: discordStatus === "operational" ? "Discord acepta la autenticación del bot." : discordStatus === "down" ? "Discord rechazó la autenticación del bot. Revisa las credenciales privadas del servicio." : "No se pudo confirmar una respuesta correcta de Discord." }
        ]
    };
    publicStatusCache = { cachedAt: Date.now(), payload };
    return res.json(payload);
});

let publicReleasesCache = null;
const PUBLIC_RELEASES_CACHE_TTL = 5 * 60_000;

app.get("/api/public/updates", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=60");
    if (publicReleasesCache && Date.now() - publicReleasesCache.cachedAt < PUBLIC_RELEASES_CACHE_TTL) {
        return res.json(publicReleasesCache.payload);
    }
    try {
        const response = await fetch("https://api.github.com/repos/dxxrkgxntel/bryants-oficial/releases?per_page=10", {
            headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
            signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) throw new Error("GitHub respondió " + response.status);
        const releases = await response.json();
        const payload = {
            updatedAt: new Date().toISOString(),
            releases: Array.isArray(releases) ? releases.filter(item => !item.draft).map(item => ({
                name: String(item.name || item.tag_name || "Versión").slice(0, 120),
                tag: String(item.tag_name || "").slice(0, 80),
                url: String(item.html_url || ""),
                publishedAt: item.published_at || null,
                prerelease: Boolean(item.prerelease),
                notes: String(item.body || "").slice(0, 6000)
            })) : []
        };
        publicReleasesCache = { cachedAt: Date.now(), payload };
        return res.json(payload);
    } catch (error) {
        if (publicReleasesCache) return res.json({ ...publicReleasesCache.payload, stale: true });
        console.warn("[Dashboard Updates] No se pudieron consultar las releases de GitHub:", error.message);
        return res.status(502).json({ error: "Las versiones publicadas no están disponibles en este momento." });
    }
});

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.get("/invitar", (_req, res) => {
    res.redirect(302, "https://discord.com/oauth2/authorize?client_id=1497973126569656540&permissions=8&integration_type=0&scope=bot");
});

app.get("/auth/login", (req, res) => {
    if (!getRedirectUri()) return res.status(503).send("Activa la dirección web de FadeHost para continuar.");
    const state = crypto.randomBytes(32).toString("hex");
    req.session.oauthState = state;
    req.session.oauthPopup = req.query.popup === "1";
    req.session.save(error => {
        if (error) return res.status(500).send("No se pudo iniciar el acceso con Discord.");
        return res.redirect(makeOAuthUrl(state));
    });
});

app.get("/auth/callback", async (req, res) => {
    const { code, state, error } = req.query;
    const expectedState = req.session.oauthState;
    const isPopup = req.session.oauthPopup === true;
    delete req.session.oauthState;
    delete req.session.oauthPopup;

    if (error || !code || !expectedState || !secureStringEqual(state, expectedState)) {
        return res.redirect(isPopup
            ? "/auth/popup-result?status=failed"
            : "/?login=failed");
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
            username: user.username,
            globalName: user.global_name || null,
            displayName: user.global_name || user.username,
            avatar: user.avatar
        };
        req.session.usernameVerified = true;
        req.session.usernameVerifiedAt = Date.now();
        req.session.oauth = {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + token.expires_in * 1000
        };
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
        return req.session.save(error => {
            if (error) return res.status(500).send("No se pudo guardar la sesión.");
            return res.redirect(isPopup
                ? "/auth/popup-result?status=success"
                : "/");
        });
    } catch (requestError) {
        console.error("[Dashboard OAuth] Error al iniciar sesión:", requestError.message);
        return res.redirect(isPopup
            ? "/auth/popup-result?status=failed"
            : "/?login=failed");
    }
});

app.get("/auth/popup-result", (_req, res) => {
    res.set("Cache-Control", "no-store");
    return res.sendFile(path.join(publicDirectory, "auth-popup-result.html"));
});

app.get("/api/me", async (req, res) => {
    res.set("Cache-Control", "no-store");
    await refreshDashboardUsername(req);
    res.json(req.session.user
        ? { user: req.session.user, csrfToken: req.session.csrfToken }
        : { user: null });
});

app.get("/api/account/settings", requireLogin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const settings = await DashboardAccount.findOne({ userId: req.session.user.id }).lean();
    return res.json({
        bio: settings?.bio || "",
        links: settings?.links || []
    });
});

app.put("/api/account/settings", requireLogin, requireCsrf, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const { bio, links } = req.body || {};
    const update = {};
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
    return res.json({ ok: true, bio: settings.bio, links: settings.links });
});

app.get("/api/account/appearance", requireLogin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const settings = await DashboardAccount.findOne({ userId: req.session.user.id }).select("backgroundBlur +backgroundMimeType").lean();
    return res.json({ backgroundBlur: settings?.backgroundBlur || 0, hasCustomBackground: Boolean(settings?.backgroundMimeType) });
});

app.put("/api/account/appearance", requireLogin, requireCsrf, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const backgroundBlur = Number(req.body?.backgroundBlur);
    if (!Number.isFinite(backgroundBlur) || backgroundBlur < 0 || backgroundBlur > 20) {
        return res.status(400).json({ error: "El difuminado debe estar entre 0 y 20 píxeles." });
    }
    const settings = await DashboardAccount.findOneAndUpdate(
        { userId: req.session.user.id },
        { $set: { backgroundBlur } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select("backgroundBlur").lean();
    return res.json({ ok: true, backgroundBlur: settings.backgroundBlur });
});

app.put("/api/account/background", requireLogin, requireCsrf, express.raw({ type: "application/octet-stream", limit: "3mb" }), async (req, res) => {
    res.set("Cache-Control", "no-store");
    const image = req.body;
    if (!Buffer.isBuffer(image) || image.length < 16) return res.status(400).json({ error: "Selecciona una imagen válida en formato PNG, JPG o WebP." });
    let mimeType = null;
    if (image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mimeType = "image/png";
    else if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) mimeType = "image/jpeg";
    else if (image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP") mimeType = "image/webp";
    if (!mimeType) return res.status(415).json({ error: "El archivo debe ser una imagen PNG, JPG o WebP." });
    await DashboardAccount.findOneAndUpdate(
        { userId: req.session.user.id },
        { $set: { backgroundImage: image, backgroundMimeType: mimeType }, $setOnInsert: { userId: req.session.user.id } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ ok: true, hasCustomBackground: true });
});

app.get("/api/account/background-image", requireLogin, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const settings = await DashboardAccount.findOne({ userId: req.session.user.id }).select("+backgroundImage +backgroundMimeType");
    if (!settings?.backgroundImage || !settings.backgroundMimeType) return res.sendFile(path.join(publicDirectory, "dashboard-gaming-background.png"));
    res.set("Content-Type", settings.backgroundMimeType);
    res.set("X-Content-Type-Options", "nosniff");
    return res.send(settings.backgroundImage);
});

app.delete("/api/account/background", requireLogin, requireCsrf, async (req, res) => {
    await DashboardAccount.updateOne(
        { userId: req.session.user.id },
        { $unset: { backgroundImage: 1, backgroundMimeType: 1 } }
    );
    return res.json({ ok: true, hasCustomBackground: false });
});

app.get("/api/account/personal-stats", requireLogin, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    try {
        const today = new Date();
        const start = new Date(today);
        start.setUTCDate(start.getUTCDate() - 29);
        const startDay = start.toISOString().slice(0, 10);
        const documents = await PersonalStatsDaily.find({
            userId: req.session.user.id,
            day: { $gte: startDay }
        }).select("day messages voiceSeconds reactionsGiven reactionsReceived activitySeconds gamingSeconds channelMessages").lean();

        const totals = {
            messages: 0, voiceSeconds: 0, reactionsGiven: 0, reactionsReceived: 0,
            activitySeconds: {}, gamingSeconds: {}, channelMessages: {}
        };
        const byDay = new Map();
        const addMap = (target, source) => {
            const entries = source instanceof Map ? [...source.entries()] : Object.entries(source || {});
            for (const [key, value] of entries) target[key] = (target[key] || 0) + (Number(value) || 0);
        };

        for (const document of documents) {
            totals.messages += Number(document.messages) || 0;
            totals.voiceSeconds += Number(document.voiceSeconds) || 0;
            totals.reactionsGiven += Number(document.reactionsGiven) || 0;
            totals.reactionsReceived += Number(document.reactionsReceived) || 0;
            addMap(totals.activitySeconds, document.activitySeconds);
            addMap(totals.gamingSeconds, document.gamingSeconds);
            addMap(totals.channelMessages, document.channelMessages);

            const daily = byDay.get(document.day) || {
                day: document.day, messages: 0, voiceSeconds: 0,
                reactionsGiven: 0, reactionsReceived: 0
            };
            daily.messages += Number(document.messages) || 0;
            daily.voiceSeconds += Number(document.voiceSeconds) || 0;
            daily.reactionsGiven += Number(document.reactionsGiven) || 0;
            daily.reactionsReceived += Number(document.reactionsReceived) || 0;
            byDay.set(document.day, daily);
        }

        const daily = [];
        for (let offset = 29; offset >= 0; offset--) {
            const date = new Date(today);
            date.setUTCHours(0, 0, 0, 0);
            date.setUTCDate(date.getUTCDate() - offset);
            const key = date.toISOString().slice(0, 10);
            daily.push(byDay.get(key) || {
                day: key, messages: 0, voiceSeconds: 0,
                reactionsGiven: 0, reactionsReceived: 0
            });
        }

        return res.json({ trackingStarted: documents.length > 0, periodDays: 30, totals, daily });
    } catch (error) {
        console.error("[Personal Stats] No se pudieron consultar las estadísticas:", error.message);
        return res.status(500).json({ error: "No pude cargar tus estadísticas personales." });
    }
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
        referralUrl: `http://bryvex.xyz/invitar?ref=${encodeURIComponent(account.referralCode)}`,
        referralReward: REFERRAL_REWARD,
        voteReward: TOPGG_VOTE_REWARD,
        voteConfigured: Boolean(process.env.TOPGG_WEBHOOK_SECRET && process.env.TOPGG_REWARD_GUILD_ID),
        referralConfigured: Boolean(getReferralRedirectUri()),
        voteRewardGuildId: process.env.TOPGG_REWARD_GUILD_ID || null,
        topggUrl: `https://top.gg/bot/${encodeURIComponent(process.env.DISCORD_CLIENT_ID)}/vote`
    });
});

app.get("/invitar", (req, res) => {
    const referralCode = String(req.query.ref || "");
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(referralCode)) return renderReferralResult(res, "invalid");
    return res.redirect(302, `/invite/${encodeURIComponent(referralCode)}`);
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
        const guildId = req.params.guildId;
        const [resources, guildResponse] = await Promise.all([
            fetchGuildResources(guildId),
            fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
                headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
            })
        ]);
        let channelPermissions = null;
        let roleManagement = null;
        try {
            const permissionAudit = await fetchBotChannelPermissions(guildId, resources.channels, resources.roles);
            channelPermissions = permissionAudit.channels;
            roleManagement = permissionAudit.roleManagement;
        } catch (error) {
            console.warn("[Dashboard Permissions] No pude comprobar los permisos efectivos del bot:", error.message);
        }
        let guild = null;
        if (guildResponse.ok) {
            const details = await guildResponse.json();
            const extension = details.icon?.startsWith("a_") ? "gif" : "png";
            guild = {
                id: details.id,
                name: details.name,
                icon: details.icon ? `https://cdn.discordapp.com/icons/${details.id}/${details.icon}.${extension}?size=128` : null
            };
        }
        return res.json({
            guild,
            channels: resources.channels.map(({ id, name, type, parent_id }) => ({ id, name, type, parentId: parent_id })),
            roles: resources.roles.filter(role => !role.managed && role.name !== "@everyone").map(({ id, name, color }) => ({ id, name, color })),
            roleIds: resources.roles.map(({ id }) => id),
            channelPermissions,
            roleManagement
        });
    } catch (error) {
        console.error("[Dashboard Resources] Error al cargar canales y roles:", error.message);
        return res.status(502).json({ error: "No pude cargar los canales y roles del servidor." });
    }
});

app.get("/api/kick/channels/search", requireLogin, async (req, res) => {
    const query = String(req.query.q || "").trim().slice(0, 50);
    if (query.length < 3) return res.json({ channels: [] });
    const cacheKey = query.toLocaleLowerCase("en");
    const cached = kickChannelSearchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return res.json({ channels: cached.channels });

    try {
        // Kick's documented developer API resolves exact slugs only; use its own site search for autocomplete.
        const url = new URL("https://kick.com/api/search");
        url.searchParams.set("searched_word", query);
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; BryantsOfficialDashboard/1.0)",
                Referer: "https://kick.com/"
            },
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error(`Kick respondió ${response.status}.`);
        const payload = await response.json();
        const channels = (Array.isArray(payload?.channels) ? payload.channels : []).map(channel => ({
            slug: String(channel.slug || "").trim().toLowerCase(),
            username: String(channel.user?.username || channel.name || channel.slug || "").trim(),
            avatarUrl: typeof channel.user?.profilePic === "string" && channel.user.profilePic.startsWith("https://") ? channel.user.profilePic : "",
            isLive: Boolean(channel.isLive)
        })).filter(channel => /^[a-z0-9_-]{1,100}$/.test(channel.slug) && channel.username).slice(0, 20);
        if (kickChannelSearchCache.size >= 200) kickChannelSearchCache.delete(kickChannelSearchCache.keys().next().value);
        kickChannelSearchCache.set(cacheKey, { channels, expiresAt: Date.now() + 30_000 });
        return res.json({ channels });
    } catch (error) {
        console.warn("[Dashboard Kick Search] No pude buscar canales:", error.message);
        return res.status(502).json({ error: "No pude buscar canales en Kick ahora. Inténtalo de nuevo." });
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
            if (key === "memberEconomy") return [key, { configured: true }];
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
                lists: Object.fromEntries(Object.entries(lists).map(([key, value]) => [key, { title: value.title, category: value.category, description: value.description, fields: value.fields }]))
            }
        });
    } catch (error) {
        console.error("[Dashboard Config] Error al leer configuración:", error.message);
        return res.status(500).json({ error: "No pude leer la configuración de este servidor." });
    }
});

app.get("/api/guilds/:guildId/leaderboards/economy", requireGuildAdmin, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    try {
        const rows = await EconomyUser.aggregate([
            { $match: { guildId: req.params.guildId } },
            { $addFields: {
                walletValue: { $ifNull: ["$wallet", 0] },
                bankValue: { $ifNull: ["$bank", 0] }
            } },
            { $addFields: { total: { $add: ["$walletValue", "$bankValue"] } } },
            { $sort: { total: -1, userId: 1 } },
            { $limit: 10 },
            { $project: { _id: 0, userId: 1, wallet: "$walletValue", bank: "$bankValue", total: 1 } }
        ]);
        const leaderboard = await Promise.all(rows.map(async (row, index) => ({
            rank: index + 1,
            userId: row.userId,
            name: await getBirthdayMemberName(req.params.guildId, row.userId) || "Miembro de Discord",
            wallet: row.wallet,
            bank: row.bank,
            total: row.total
        })));
        return res.json({ leaderboard, metric: "wallet_plus_bank", updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error("[Dashboard Leaderboard] Error al consultar la economía:", error.message);
        return res.status(500).json({ error: "No pude cargar la clasificación de economía de este servidor." });
    }
});

app.get("/api/guilds/:guildId/leaderboards/experience", requireGuildAdmin, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    try {
        const rows = await Level.find({ guildId: req.params.guildId, $or: [{ xp: { $gt: 0 } }, { level: { $gt: 0 } }, { prestige: { $gt: 0 } }] })
            .sort({ level: -1, xp: -1, prestige: -1, userId: 1 }).limit(10).select({ _id: 0, userId: 1, xp: 1, level: 1, prestige: 1 }).lean();
        const leaderboard = await Promise.all(rows.map(async (row, index) => ({
            rank: index + 1, userId: row.userId,
            name: await getBirthdayMemberName(req.params.guildId, row.userId) || "Miembro de Discord",
            xp: Number(row.xp) || 0, level: Number(row.level) || 0, prestige: Number(row.prestige) || 0
        })));
        return res.json({ leaderboard, metric: "level_xp_prestige", updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error("[Dashboard Leaderboard] Error al consultar la experiencia:", error.message);
        return res.status(500).json({ error: "No pude cargar la clasificación de experiencia de este servidor." });
    }
});

app.get("/api/guilds/:guildId/stats/overview", requireGuildAdmin, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    try {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
        const startDay = start.toISOString().slice(0, 10);
        const guildId = req.params.guildId;
        const [daily, levelSummary, economySummary, auditCount] = await Promise.all([
            PersonalStatsDaily.aggregate([
                { $match: { guildId, day: { $gte: startDay } } },
                { $group: { _id: "$day", messages: { $sum: "$messages" }, voiceSeconds: { $sum: "$voiceSeconds" }, reactionsGiven: { $sum: "$reactionsGiven" }, reactionsReceived: { $sum: "$reactionsReceived" } } },
                { $sort: { _id: 1 } }
            ]),
            Level.aggregate([
                { $match: { guildId } },
                { $group: { _id: null, members: { $sum: 1 }, totalXp: { $sum: "$xp" }, highestLevel: { $max: "$level" }, activeMembers: { $sum: { $cond: [{ $gt: ["$xp", 0] }, 1, 0] } } } }
            ]),
            EconomyUser.countDocuments({ guildId }),
            DashboardAuditLog.countDocuments({ guildId, createdAt: { $gte: start } })
        ]);
        const byDay = new Map(daily.map(row => [row._id, row]));
        const series = [];
        for (let offset = 0; offset < 30; offset++) {
            const date = new Date(start.getTime() + offset * 86400000);
            const day = date.toISOString().slice(0, 10);
            const row = byDay.get(day) || {};
            series.push({ day, messages: row.messages || 0, voiceSeconds: row.voiceSeconds || 0, reactionsGiven: row.reactionsGiven || 0, reactionsReceived: row.reactionsReceived || 0 });
        }
        const levels = levelSummary[0] || { members: 0, totalXp: 0, highestLevel: 0, activeMembers: 0 };
        return res.json({
            period: { start: startDay, end: now.toISOString().slice(0, 10), days: 30 },
            activity: {
                messages: series.reduce((sum, item) => sum + item.messages, 0),
                voiceSeconds: series.reduce((sum, item) => sum + item.voiceSeconds, 0),
                reactionsGiven: series.reduce((sum, item) => sum + item.reactionsGiven, 0),
                reactionsReceived: series.reduce((sum, item) => sum + item.reactionsReceived, 0)
            },
            levels: { trackedMembers: levels.members, activeMembers: levels.activeMembers, totalXp: levels.totalXp, highestLevel: levels.highestLevel },
            economy: { trackedUsers: economySummary },
            dashboard: { auditActions: auditCount },
            daily: series,
            updatedAt: now.toISOString()
        });
    } catch (error) {
        console.error("[Dashboard Stats] Error al consultar estadísticas:", error.message);
        return res.status(500).json({ error: "No pude cargar las estadísticas de este servidor." });
    }
});

app.get("/api/guilds/:guildId/members/search", requireGuildAdmin, async (req, res) => {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) return res.json({ members: [] });

    try {
        const discordUrl = new URL(`https://discord.com/api/v10/guilds/${req.params.guildId}/members/search`);
        discordUrl.searchParams.set("query", query);
        discordUrl.searchParams.set("limit", "10");

        const members = await discordBotRequest(discordUrl.toString());
        if (!Array.isArray(members)) {
            console.error("[Dashboard Members] Discord devolvió una respuesta inesperada al buscar miembros.", {
                guildId: req.params.guildId,
                queryLength: query.length
            });
            return res.status(502).json({ error: "Discord devolvió una respuesta inesperada al buscar miembros. Inténtalo de nuevo." });
        }

        return res.json({
            members: members
                .filter(member => member?.user?.id && member.user.username)
                .map(member => ({
                    id: member.user.id,
                    username: member.user.username,
                    globalName: member.user.global_name || null,
                    nick: member.nick || null,
                    avatar: member.user.avatar || null
                }))
        });
    } catch (error) {
        console.error("[Dashboard Members] Error buscando miembros en Discord:", {
            guildId: req.params.guildId,
            queryLength: query.length,
            status: error.status || null,
            message: error.message || "Error desconocido"
        });
        return res.status(error.status === 429 ? 429 : 502).json({
            error: error.status === 429
                ? "Discord está limitando las búsquedas. Espera unos segundos e inténtalo de nuevo."
                : error.message || "No pude buscar miembros en Discord."
        });
    }
});

app.get("/api/guilds/:guildId/members/:userId/economy", requireGuildAdmin, async (req, res) => {
    if (!/^\d{17,20}$/.test(req.params.userId)) return res.status(400).json({ error: "ID de miembro inválido." });
    try {
        const [member, economy] = await Promise.all([
            discordBotRequest(`https://discord.com/api/v10/guilds/${req.params.guildId}/members/${req.params.userId}`),
            EconomyUser.findOne({ guildId: req.params.guildId, userId: req.params.userId }).lean()
        ]);
        return res.json({ member: { id: member.user.id, username: member.user.username, globalName: member.user.global_name, nick: member.nick, avatar: member.user.avatar }, economy: economy || { wallet: 0, bank: 0 } });
    } catch (error) { return res.status(error.status === 404 ? 404 : 502).json({ error: error.status === 404 ? "El miembro ya no está en el servidor." : error.message || "No pude cargar la economía." }); }
});

app.put("/api/guilds/:guildId/members/:userId/economy", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    if (!/^\d{17,20}$/.test(req.params.userId)) return res.status(400).json({ error: "ID de miembro inválido." });
    const { wallet, bank } = req.body || {};
    const maxBalance = 99999999999;
    if (![wallet, bank].every(value => Number.isSafeInteger(value) && value >= 0 && value <= maxBalance)) {
        return res.status(400).json({ error: "La cartera y el banco deben ser números enteros entre 0 y 99.999.999.999." });
    }
    try {
        await discordBotRequest(`https://discord.com/api/v10/guilds/${req.params.guildId}/members/${req.params.userId}`);
        const economy = await EconomyUser.findOneAndUpdate(
            { guildId: req.params.guildId, userId: req.params.userId },
            { $set: { wallet, bank }, $setOnInsert: { guildId: req.params.guildId, userId: req.params.userId } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();
        await recordDashboardAudit(req, req.params.guildId, "Balance de miembro actualizado");
        return res.json({ economy });
    } catch (error) {
        return res.status(error.status === 404 ? 404 : 502).json({ error: error.status === 404 ? "El miembro ya no está en el servidor." : error.message || "No pude actualizar el balance." });
    }
});

app.put("/api/guilds/:guildId/config/:module", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    const definition = configurations[req.params.module];
    if (!definition) return res.status(404).json({ error: "No encontré ese sistema." });
    try {
        if (req.params.module === "specialChannels") {
            const channels = req.body.channels;
            if (!Array.isArray(channels) || channels.length > 25) {
                throw new Error("Puedes configurar hasta 25 canales.");
            }
            const channelIds = new Set();
            const roleIds = new Set();
            for (const rule of channels) {
                if (!rule || typeof rule.channelId !== "string" || channelIds.has(rule.channelId)) {
                    throw new Error("Cada canal debe ser válido y aparecer una sola vez.");
                }
                channelIds.add(rule.channelId);
                if (!Array.isArray(rule.immuneRoles) || rule.immuneRoles.length > 25) {
                    throw new Error("Puedes asignar hasta 25 roles inmunes por canal.");
                }
                if (rule.logChannelId != null && typeof rule.logChannelId !== "string") {
                    throw new Error("Selecciona un canal de registro válido.");
                }
                rule.immuneRoles.forEach(id => roleIds.add(id));
                for (const key of ["text", "images", "videos", "files", "stickers", "links", "commands"]) {
                    if (typeof rule[key] !== "boolean") throw new Error("Revisa los tipos de contenido seleccionados.");
                }
            }
            const { channels: guildChannels, roles: guildRoles } = await fetchGuildResources(req.params.guildId);
            const validChannelIds = new Set(guildChannels.filter(channel => channel.type === 0).map(channel => channel.id));
            const validRoleIds = new Set(guildRoles.map(role => role.id));
            if ([...channelIds].some(id => !validChannelIds.has(id))) throw new Error("Selecciona canales de texto de este servidor.");
            if (channels.some(rule => rule.logChannelId && !validChannelIds.has(rule.logChannelId))) throw new Error("El canal de registro debe ser un canal de texto de este servidor.");
            if ([...roleIds].some(id => !validRoleIds.has(id))) throw new Error("Los roles inmunes deben pertenecer a este servidor.");
            const document = await definition.model.findOneAndUpdate(
                { guildId: req.params.guildId },
                { $set: { channels }, $setOnInsert: { guildId: req.params.guildId } },
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );
            await recordDashboardAudit(req, req.params.guildId, "Canales especiales actualizados");
            return res.json({ configuration: serialize(document) });
        }
        const update = cleanFields(definition.fields, req.body);
        if (!Object.keys(update).length) return res.status(400).json({ error: "No hay cambios para guardar." });
        if (req.params.module === "inviteTracker") {
            const current = await definition.model.findOne({ [definition.guildField]: req.params.guildId }).lean();
            const nextEnabled = Object.prototype.hasOwnProperty.call(update, "InviteTrackerEnabled")
                ? update.InviteTrackerEnabled
                : Boolean(current?.InviteTrackerEnabled);
            const nextChannel = Object.prototype.hasOwnProperty.call(update, "InviteTrackerChannel")
                ? update.InviteTrackerChannel
                : current?.InviteTrackerChannel;
            if (nextEnabled && !nextChannel) {
                throw new Error("Selecciona un canal de logs antes de activar el Invite Tracker.");
            }
        }
        await validateDiscordReferences(req.params.guildId, definition.fields, update);
        if (req.params.module === "antiInvites") {
            const config = await definition.model.findOne({ guildId: req.params.guildId }).lean();
            const nextEnabled = Object.prototype.hasOwnProperty.call(update, "enabled")
                ? update.enabled
                : Boolean(config?.enabled);
            const nextLogChannelId = Object.prototype.hasOwnProperty.call(update, "logChannelId")
                ? update.logChannelId
                : config?.logChannelId || null;
            const rulesUrl = `https://discord.com/api/v10/guilds/${req.params.guildId}/auto-moderation/rules`;
            const rules = await discordBotRequest(rulesUrl);
            const rule = rules.find(item => item.id === config?.ruleId || item.name === "Bryants Anti-Invites");
            let ruleId = rule?.id || null;
            if (nextEnabled) {
                const body = {
                    name: "Bryants Anti-Invites", event_type: 1, trigger_type: 1,
                    trigger_metadata: { regex_patterns: ["(?:https?:\\/\\/)?(?:www\\.)?(?:discord\\.gg|discord(?:app)?\\.com\\/invite)\\/[A-Za-z0-9-]+"] },
                    actions: [{ type: 1, metadata: { custom_message: "No puedes compartir invitaciones a otros servidores." } }, ...(nextLogChannelId ? [{ type: 2, metadata: { channel_id: nextLogChannelId } }] : [])],
                    enabled: true, exempt_roles: [], exempt_channels: []
                };
                const saved = rule
                    ? await discordBotRequest(`${rulesUrl}/${rule.id}`, { method: "PATCH", body })
                    : await discordBotRequest(rulesUrl, { method: "POST", body });
                ruleId = saved.id;
            } else if (rule) {
                await discordBotRequest(`${rulesUrl}/${rule.id}`, { method: "DELETE" });
                ruleId = null;
            }
            update.ruleId = ruleId;
        }
        const document = await definition.model.findOneAndUpdate(
            { [definition.guildField]: req.params.guildId },
            { $set: update, $setOnInsert: { [definition.guildField]: req.params.guildId } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        await recordDashboardAudit(req, req.params.guildId, `${definition.title} actualizada`);
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
        await recordDashboardAudit(req, req.params.guildId, "Encuesta creada");
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
        await recordDashboardAudit(req, req.params.guildId, "Encuesta actualizada");
        return res.json({ ok: true, url: `https://discord.com/channels/${req.params.guildId}/${poll.channelId}/${poll.messageId}` });
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
        await recordDashboardAudit(req, req.params.guildId, "Encuesta eliminada");
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
        await recordDashboardAudit(req, req.params.guildId, `${definition.title}: elemento creado`);
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
        if (item) await recordDashboardAudit(req, req.params.guildId, `${definition.title}: elemento actualizado`);
        return item ? res.json({ item: serialize(item) }) : res.status(404).json({ error: "No encontré este elemento." });
    } catch (error) {
        return res.status(400).json({ error: error.message || "No pude guardar este elemento." });
    }
});

app.delete("/api/guilds/:guildId/lists/:list/:recordId", requireLogin, requireCsrf, requireGuildAdmin, async (req, res) => {
    const definition = lists[req.params.list];
    if (!definition) return res.status(404).json({ error: "No encontré esa lista." });
    const removed = await definition.model.findOneAndDelete({ _id: req.params.recordId, guildId: req.params.guildId });
    if (removed) await recordDashboardAudit(req, req.params.guildId, `${definition.title}: elemento eliminado`);
    if (removed && req.params.list === "socialAlerts") {
        const state = await SocialAlertState.findOneAndDelete({ guildId: req.params.guildId, alertId: removed._id });
        if (state?.webhookId && state?.webhookToken) {
            await fetch(`https://discord.com/api/v10/webhooks/${state.webhookId}/${state.webhookToken}`, {
                method: "DELETE",
                signal: AbortSignal.timeout(8_000)
            }).catch(error => console.warn("[Dashboard Social Alerts] No pude limpiar el webhook de la alerta eliminada:", error.message));
        }
    }
    return removed ? res.json({ ok: true }) : res.status(404).json({ error: "No encontré este elemento." });
});

app.get("/api/guilds/:guildId/audit", requireGuildAdmin, async (req, res) => {
    const page = Math.max(1, Math.min(10_000, Number.parseInt(req.query.page, 10) || 1));
    const allowedPageSizes = [10, 25, 50];
    const requestedPageSize = Number.parseInt(req.query.perPage, 10) || 25;
    const perPage = allowedPageSizes.includes(requestedPageSize) ? requestedPageSize : 25;
    try {
        const filter = { guildId: req.params.guildId };
        const [total, entries] = await Promise.all([
            DashboardAuditLog.countDocuments(filter),
            DashboardAuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * perPage).limit(perPage).lean()
        ]);
        return res.json({
            entries: entries.map(entry => ({
                id: String(entry._id),
                actorId: entry.actorId,
                actorUsername: entry.actorUsername,
                action: entry.action,
                createdAt: entry.createdAt
            })),
            page,
            perPage,
            total,
            totalPages: Math.max(1, Math.ceil(total / perPage))
        });
    } catch (error) {
        console.error("[Dashboard Audit] No pude cargar el registro:", error.message);
        return res.status(500).json({ error: "No pude cargar el registro de auditoría." });
    }
});


const SupportTicket = require("../Models/SupportTicket");
const SupportTicketConfig = require("../Models/SupportTicketConfig");

// Caché breve para evitar consultar la API de Discord en cada actualización de la página.
const supportUserGuildsCache = new Map();
const supportStaffGuildsCache = new Map();
const supportStaffGuildsPending = new Map();
const SUPPORT_GUILDS_CACHE_TTL = 60_000;
const SUPPORT_STAFF_CACHE_TTL = 30_000;
let publicStatusCache = null;
const PUBLIC_STATUS_CACHE_TTL = 30_000;

async function supportDiscordBotRequest(url, options = {}) {
    return fetch(`https://discord.com/api/v10${url}`, {
        ...options,
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json", ...(options.headers || {}) },
        signal: AbortSignal.timeout(8000)
    });
}
async function notifySupportTicketReply(userId, ticketNumber) {
    try {
        const dmResponse = await supportDiscordBotRequest("/users/@me/channels", {
            method: "POST",
            body: JSON.stringify({ recipient_id: userId })
        });
        if (!dmResponse.ok) throw new Error(`Discord no pudo abrir el DM (${dmResponse.status}).`);
        const dmChannel = await dmResponse.json();
        const messageResponse = await supportDiscordBotRequest(`/channels/${dmChannel.id}/messages`, {
            method: "POST",
            body: JSON.stringify({ content: `Te han respondido en tu ticket #${ticketNumber}, ve chequealo.` })
        });
        if (!messageResponse.ok) throw new Error(`Discord no pudo enviar el aviso por DM (${messageResponse.status}).`);
    } catch (error) {
        console.warn("[Support] No se pudo enviar el aviso por DM:", error.message);
    }
}
async function getSupportUserGuilds(req) {
    if (!await refreshOAuthToken(req)) throw new Error("La sesión de Discord venció. Vuelve a iniciar sesión.");
    const userId = req.session.user.id;
    const cached = supportUserGuildsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.guilds;

    const guilds = await discordRequest("https://discord.com/api/v10/users/@me/guilds", req.session.oauth.accessToken);
    supportUserGuildsCache.set(userId, { guilds, expiresAt: Date.now() + SUPPORT_GUILDS_CACHE_TTL });
    return guilds;
}
async function getConfiguredSupportGuilds() {
    const config = await SupportTicketConfig.findOne({ enabled: true }).sort({ updatedAt: -1 }).lean();
    if (!config) return [];
    try {
        const response = await supportDiscordBotRequest(`/guilds/${config.guildId}`);
        if (!response.ok) return [];
        const guild = await response.json();
        return [{
            id: config.guildId,
            name: guild.name || "Bryvex Support",
            icon: guild.icon ? `https://cdn.discordapp.com/icons/${config.guildId}/${guild.icon}.png?size=128` : null
        }];
    } catch {
        return [];
    }
}
async function getSupportStaffGuildIdsUncached(req) {
    const [userGuilds, configs] = await Promise.all([
        getSupportUserGuilds(req),
        SupportTicketConfig.find({ enabled: true }).lean()
    ]);
    const guildMap = new Map(userGuilds.map(guild => [guild.id, guild]));
    const relevant = configs.filter(config => guildMap.has(config.guildId));
    const checks = await Promise.all(relevant.map(async config => {
        const guild = guildMap.get(config.guildId);
        if (config.staffUserIds?.includes(req.session.user.id)) return config.guildId;
        let isAdmin = Boolean(guild.owner);
        try { isAdmin ||= (BigInt(guild.permissions || guild.permissions_new || "0") & 8n) === 8n; } catch {}
        if (isAdmin) return config.guildId;
        if (!config.staffRoleId) return null;
        try {
            const response = await supportDiscordBotRequest(`/guilds/${config.guildId}/members/${req.session.user.id}`);
            if (!response.ok) return null;
            const member = await response.json();
            return member.roles?.includes(config.staffRoleId) ? config.guildId : null;
        } catch { return null; }
    }));
    return new Set(checks.filter(Boolean));
}
async function getSupportStaffGuildIds(req) {
    const userId = req.session.user.id;
    const cached = supportStaffGuildsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.guildIds;
    if (supportStaffGuildsPending.has(userId)) return supportStaffGuildsPending.get(userId);

    const pending = getSupportStaffGuildIdsUncached(req)
        .then(guildIds => {
            supportStaffGuildsCache.set(userId, { guildIds, expiresAt: Date.now() + SUPPORT_STAFF_CACHE_TTL });
            return guildIds;
        })
        .finally(() => supportStaffGuildsPending.delete(userId));
    supportStaffGuildsPending.set(userId, pending);
    return pending;
}

async function canAccessSupportTicket(req, ticket) {
    if (ticket.userId === req.session.user.id) return true;
    const guildId = ticket.guildId || ticket.discordGuildId;
    if (!guildId) return false;
    const staffGuildIds = await getSupportStaffGuildIds(req);
    return staffGuildIds.has(guildId);
}
function publicTicket(ticket) {
    return {
        id: String(ticket._id), ticketNumber: ticket.ticketNumber, subject: ticket.subject,
        category: ticket.category, status: ticket.status, source: ticket.source,
        guildId: ticket.guildId || ticket.discordGuildId || null, guildName: ticket.guildName || null,
        createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, lastMessageAt: ticket.lastMessageAt,
        messages: ticket.messages.map(message => ({
            id: String(message._id), authorId: message.authorId, authorName: message.authorName,
            authorAvatar: message.authorAvatar, source: message.source, content: message.content, createdAt: message.createdAt
        }))
    };
}
async function createDiscordSupportChannel(ticket, userId, config, guildId) {
    const staffRoleId = config.staffRoleId;
    const overwrites = [
        { id: guildId, type: 0, deny: "1024" },
        { id: userId, type: 1, allow: "68608" },
        { id: process.env.DISCORD_CLIENT_ID, type: 1, allow: "68624" }
    ];
    if (staffRoleId) overwrites.push({ id: staffRoleId, type: 0, allow: "68608" });
    const response = await supportDiscordBotRequest(`/guilds/${guildId}/channels`, {
        method: "POST", body: JSON.stringify({
            name: `soporte-${ticket.category}-${ticket.ticketNumber}`, type: 0,
            parent_id: config.categoryId || undefined,
            permission_overwrites: overwrites,
            topic: `Ticket #${ticket.ticketNumber} · ${ticket.category === "bot" ? "Bryvex Bot" : "Web de Bryvex Bot"} · Usuario Discord ${userId}`
        })
    });
    if (!response.ok) throw new Error(`Discord no pudo crear el canal de soporte (${response.status}).`);
    const channel = await response.json();
    ticket.guildId = guildId;
    ticket.discordGuildId = guildId;
    ticket.discordChannelId = channel.id;
    await ticket.save();
    const initialMessage = ticket.messages[0]?.content || "";
    const greeting = `Ticket #${ticket.ticketNumber} creado desde la web de Bryvex Bot. Categoría: ${ticket.category === "bot" ? "Bryvex Bot" : "Página web de Bryvex Bot"}.\nUsuario: <@!${userId}>\nAsunto: ${ticket.subject}\n\nMensaje inicial:\n${initialMessage}`;
    const messageResponse = await supportDiscordBotRequest(`/channels/${channel.id}/messages`, { method: "POST", body: JSON.stringify({ content: greeting }) });
    if (!messageResponse.ok) console.warn("[Support] Se creó el canal, pero no se pudo publicar el mensaje inicial:", messageResponse.status);
    return channel.id;
}

app.get("/support", (_req, res) => res.sendFile(path.join(publicDirectory, "support.html")));

app.get("/api/support/guilds", requireLogin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        return res.json({ guilds: await getConfiguredSupportGuilds(req) });
    } catch (error) {
        console.error("[Support] No pude cargar servidores disponibles:", error.message);
        return res.status(502).json({ error: "No pude consultar tus servidores de Discord." });
    }
});

app.get("/api/support/tickets", requireLogin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const staffGuildIds = await getSupportStaffGuildIds(req);
        const clauses = [{ userId: req.session.user.id }];
        if (staffGuildIds.size) {
            const ids = [...staffGuildIds];
            clauses.push({ guildId: { $in: ids } }, { discordGuildId: { $in: ids } });
        }
        const tickets = await SupportTicket.find({ $or: clauses }).sort({ updatedAt: -1 }).limit(100).lean();
        return res.json({ tickets: tickets.map(ticket => ({
            id: String(ticket._id), ticketNumber: ticket.ticketNumber, subject: ticket.subject,
            category: ticket.category, status: ticket.status, source: ticket.source,
            guildId: ticket.guildId || ticket.discordGuildId || null, guildName: ticket.guildName || null,
            createdAt: ticket.createdAt, updatedAt: ticket.updatedAt
        })) });
    } catch (error) {
        console.error("[Support] No pude cargar los tickets:", error.message);
        return res.status(500).json({ error: "No pude cargar los tickets de soporte." });
    }
});

app.post("/api/support/tickets", requireLogin, requireCsrf, async (req, res) => {
    const category = req.body?.category;
    const subject = String(req.body?.subject || "").trim();
    const content = String(req.body?.message || "").trim();
    if (!["bot", "website"].includes(category)) return res.status(400).json({ error: "Selecciona una categoría de soporte válida." });
    if (subject.length < 4 || subject.length > 120) return res.status(400).json({ error: "El asunto debe tener entre 4 y 120 caracteres." });
    if (content.length < 10 || content.length > 4000) return res.status(400).json({ error: "El mensaje debe tener entre 10 y 4.000 caracteres." });
    try {
        const config = await SupportTicketConfig.findOne({ enabled: true }).sort({ updatedAt: -1 }).lean();
        if (!config) return res.status(503).json({ error: "El centro de soporte de Bryvex Bot aún no está configurado. Vuelve a intentarlo más tarde." });
        const guildResponse = await supportDiscordBotRequest(`/guilds/${config.guildId}`);
        if (!guildResponse.ok) return res.status(409).json({ error: "Bryvex Bot no está disponible en el servidor Bryvex Support." });
        const guildData = await guildResponse.json();
        const supportGuild = { id: config.guildId, name: guildData.name || "Bryvex Support" };
        const openTicket = await SupportTicket.findOne({ userId: req.session.user.id, status: "open", category });
        if (openTicket) return res.status(409).json({ error: `Ya tienes un ticket abierto de esta categoría (#${openTicket.ticketNumber}). Continúa la conversación existente.` });
        const ticketNumber = (await SupportTicket.countDocuments({})) + 1;
        const user = req.session.user;
        const username = user.displayName || user.globalName || user.username;
        const avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null;
        const ticket = await SupportTicket.create({
            ticketNumber, userId: user.id, username, userAvatar: avatar,
            subject, category, status: "open", source: "web", guildId: supportGuild.id, guildName: supportGuild.name,
            discordGuildId: supportGuild.id,
            messages: [{ authorId: user.id, authorName: username, authorAvatar: avatar, source: "web", content }]
        });
        try { await createDiscordSupportChannel(ticket, user.id, config, supportGuild.id); }
        catch (discordError) { await SupportTicket.deleteOne({ _id: ticket._id }).catch(() => {}); throw discordError; }
        return res.status(201).json({ ticket: publicTicket(ticket) });
    } catch (error) {
        console.error("[Support] No pude crear el ticket:", error.message);
        return res.status(500).json({ error: "No pude crear el ticket en Bryvex Support. Comprueba que el bot tenga permisos en ese servidor." });
    }
});

app.get("/api/support/tickets/:ticketId", requireLogin, async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.ticketId)) return res.status(404).json({ error: "Ticket no encontrado." });
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket || !await canAccessSupportTicket(req, ticket)) return res.status(404).json({ error: "Ticket no encontrado." });
        return res.json({ ticket: publicTicket(ticket) });
    } catch (error) {
        console.error("[Support] No pude abrir el ticket:", error.message);
        return res.status(500).json({ error: "No pude abrir el ticket." });
    }
});

app.post("/api/support/tickets/:ticketId/messages", requireLogin, requireCsrf, async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.ticketId)) return res.status(404).json({ error: "Ticket no encontrado." });
    const content = String(req.body?.content || "").trim();
    if (!content || content.length > 4000) return res.status(400).json({ error: "El mensaje debe tener entre 1 y 4.000 caracteres." });
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket || !await canAccessSupportTicket(req, ticket)) return res.status(404).json({ error: "Ticket no encontrado." });
        if (ticket.status !== "open") return res.status(409).json({ error: "Este ticket está cerrado." });
        const staffGuildIds = await getSupportStaffGuildIds(req);
        const guildId = ticket.guildId || ticket.discordGuildId;
        const isStaff = Boolean(guildId && staffGuildIds.has(guildId));
        const user = req.session.user;
        const authorName = isStaff ? (user.displayName || user.globalName || user.username) : ticket.username;
        const message = { authorId: user.id, authorName, authorAvatar: null, source: "web", content };
        if (ticket.discordChannelId) {
            const discordResponse = await supportDiscordBotRequest(`/channels/${ticket.discordChannelId}/messages`, {
                method: "POST", body: JSON.stringify({ content: `**${authorName}** · respuesta desde la web:\n${content}` })
            });
            if (!discordResponse.ok) return res.status(502).json({ error: "No pude publicar la respuesta en el canal de Discord. No se guardó el mensaje." });
            const discordMessage = await discordResponse.json();
            message.discordMessageId = discordMessage.id;
        }
        ticket.messages.push(message);
        ticket.lastMessageAt = new Date();
        await ticket.save();
        if (isStaff && user.id !== ticket.userId) {
            await notifySupportTicketReply(ticket.userId, ticket.ticketNumber);
        }
        return res.json({ ticket: publicTicket(ticket) });
    } catch (error) {
        console.error("[Support] No pude guardar la respuesta:", error.message);
        return res.status(500).json({ error: "No pude enviar la respuesta." });
    }
});

app.post("/api/support/tickets/:ticketId/close", requireLogin, requireCsrf, async (req, res) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.ticketId)) return res.status(404).json({ error: "Ticket no encontrado." });
    try {
        const ticket = await SupportTicket.findById(req.params.ticketId);
        if (!ticket || !await canAccessSupportTicket(req, ticket)) return res.status(404).json({ error: "Ticket no encontrado." });
        if (ticket.status === "closed") return res.json({ ticket: publicTicket(ticket) });
        ticket.status = "closed"; ticket.closedAt = new Date(); ticket.lastMessageAt = new Date();
        ticket.messages.push({ authorId: req.session.user.id, authorName: req.session.user.displayName || req.session.user.username, source: "system", content: "Ticket cerrado desde la web." });
        await ticket.save();
        if (ticket.discordChannelId) {
            await supportDiscordBotRequest(`/channels/${ticket.discordChannelId}/messages`, { method: "POST", body: JSON.stringify({ content: `Ticket #${ticket.ticketNumber} cerrado desde la web.` }) }).catch(() => {});
            await supportDiscordBotRequest(`/channels/${ticket.discordChannelId}/permissions/${ticket.userId}`, { method: "PUT", body: JSON.stringify({ type: 1, allow: "66560", deny: "2048" }) }).catch(() => {});
        }
        return res.json({ ticket: publicTicket(ticket) });
    } catch (error) {
        console.error("[Support] No pude cerrar el ticket:", error.message);
        return res.status(500).json({ error: "No pude cerrar el ticket." });
    }
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

const previewGuildIconCache = { value: null, expiresAt: 0 };

app.get("/api/preview-server-icon", async (_req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    if (previewGuildIconCache.expiresAt > Date.now()) return res.json(previewGuildIconCache.value);

    try {
        const inviteResponse = await fetch("https://discord.com/api/v10/invites/7zCzDCJUQ9?with_counts=true", {
            headers: { "Accept": "application/json" },
            signal: AbortSignal.timeout(8000)
        });
        if (!inviteResponse.ok) {
            return res.status(502).json({ error: "No pude consultar la invitación del servidor." });
        }
        const invite = await inviteResponse.json();
        const guild = invite.guild;
        if (!guild || guild.id !== "1552132491391934527") {
            return res.status(502).json({ error: "La invitación no corresponde al servidor de la vista previa." });
        }

        const icon = typeof guild.icon === "string" ? guild.icon : null;
        const extension = icon?.startsWith("a_") ? "gif" : "png";
        const payload = {
            iconUrl: icon ? `https://cdn.discordapp.com/icons/${guild.id}/${icon}.${extension}?size=128` : null
        };
        previewGuildIconCache.value = payload;
        previewGuildIconCache.expiresAt = Date.now() + 5 * 60_000;
        return res.json(payload);
    } catch (error) {
        console.error("[Dashboard Preview] No pude actualizar el icono del servidor:", error.message);
        return res.status(502).json({ error: "No pude actualizar el icono de la vista previa." });
    }
});

app.get("/api/version", (_req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
        const trackedFiles = [
            "index.html", "server.html", "account.html", "support.html",
            "server.js", "app.js", "account.js", "support.js",
            "appearance.js", "account-menu.js", "styles.css", "support.css",
            "version-check.js", "personal-stats.js", "preview-server-icon.js",
            "hub.css", "hub.js", "status.html", "docs.html", "updates.html", "updates.js",
            "stats.html", "stats.js", "leaderboard.html", "leaderboard.js", "templates.html", "templates.js"
        ];
        const hash = crypto.createHash("sha256");
        for (const file of trackedFiles) {
            hash.update(file);
            try { hash.update(fs.readFileSync(path.join(publicDirectory, file))); }
            catch (error) { if (error.code !== "ENOENT") throw error; }
        }
        return res.json({ version: hash.digest("hex").slice(0, 16) });
    } catch (error) {
        console.error("[Dashboard Version] No pude calcular la versión:", error.message);
        return res.status(500).json({ error: "No se pudo consultar la versión." });
    }
});

app.use(express.static(publicDirectory, {
    extensions: ["html"],
    index: "index.html",
    maxAge: 0,
    setHeaders(res, filePath) {
        if (/\.html?$/i.test(filePath)) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
        } else if (/\.(?:js|css)$/i.test(filePath)) {
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
        }
    }
}));

app.use((error, _req, res, _next) => {
    console.error("[Dashboard] Error inesperado:", error);
    if (error.type === "entity.too.large") return res.status(413).json({ error: "La imagen no puede superar los 3 MB." });
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
