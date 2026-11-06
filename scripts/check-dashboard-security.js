const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "dashboard", "server.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "dashboard", "public", "server.js"), "utf8");
const templateSource = fs.readFileSync(path.join(root, "dashboard", "public", "templates.js"), "utf8");
const leaderboardSource = fs.readFileSync(path.join(root, "dashboard", "public", "leaderboard.js"), "utf8");
const achievementSource = fs.readFileSync(path.join(root, "Functions", "achievementTracker.js"), "utf8");
const shopSource = fs.readFileSync(path.join(root, "Utils", "shopHandlers.js"), "utf8");
const economyUserSource = fs.readFileSync(path.join(root, "Models", "EconomyUser.js"), "utf8");
const moduleSource = fs.readFileSync(path.join(root, "dashboard", "modules.js"), "utf8");

function requirePattern(pattern, message) {
    assert.match(source, pattern, message);
}

function requireRoute(method, route, middleware, message) {
    const pattern = new RegExp("app\\." + method + "\\([\"']" + route + "[\"'],([^\\n]*)");
    const match = source.match(pattern);
    assert.ok(match, "No se encontró la ruta " + method.toUpperCase() + " " + route);
    for (const item of middleware) {
        assert.ok(match[1].includes(item), message + ": falta " + item + " en " + method.toUpperCase() + " " + route);
    }
}

requirePattern(/httpOnly:\s*true/, "Las cookies de sesión deben ser httpOnly");
requirePattern(/secure:\s*isProduction/, "Las cookies deben usar Secure en producción");
requirePattern(/sameSite:\s*"lax"/, "La cookie de sesión debe limitar solicitudes cross-site");
requirePattern(/secret:\s*process\.env\.DASHBOARD_SESSION_SECRET/, "La sesión debe usar un secreto de entorno");
requirePattern(/DASHBOARD_SESSION_SECRET\.length < 32/, "El servidor debe rechazar secretos de sesión débiles");
requirePattern(/signal: AbortSignal\.timeout\(8000\)/, "Las llamadas externas del dashboard deben tener un límite de tiempo");
requirePattern(/async function validateAssignableRoleIds[\s\S]*?role\.position >= botHighestPosition/, "Las asignaciones de roles deben validar permisos y jerarquía del bot");
requirePattern(/roleIds\.some\(id => typeof id !== "string" \|\| !\/\^\\d\{17,20\}\$\/.test\(id\)/, "La validación debe rechazar IDs de rol malformados");
requirePattern(/getAssignableRoleIdsForConfiguration\(req\.params\.module, update\)/, "La configuración debe validar los roles que Bryvex asignará");
requirePattern(/validateAssignableRoleIds\(req\.params\.guildId, \[data\.roleId\]\)/, "Las recompensas y tienda deben validar los roles asignables");
requirePattern(/function requireCsrf\([\s\S]*?crypto\.timingSafeEqual/, "Las escrituras deben poder protegerse con CSRF");
requirePattern(/function secureStringEqual\([\s\S]*?crypto\.timingSafeEqual/, "Las comparaciones de secretos deben ser seguras");
requirePattern(/!secureStringEqual\(state, expectedState\)/, "OAuth debe validar state con comparación segura");
requirePattern(/app\.disable\("x-powered-by"\)/, "Express no debe revelar su cabecera de identificación");
requirePattern(/app\.use\(helmet\(/, "Deben activarse cabeceras de seguridad HTTP");
requirePattern(/express\.json\(\{\s*limit:\s*"(?:32kb|1mb)"/, "El cuerpo JSON debe tener un límite de tamaño");
requirePattern(/sourceItems\.length > 500/, "La importación de logros debe limitar la cantidad de registros del backup");
requireRoute("post", "/api/guilds/:guildId/achievements/import", ["requireLogin", "requireCsrf", "requireGuildAdmin"], "La importación de logros debe estar protegida");
requireRoute("get", "/api/guilds/:guildId/achievements/export", ["requireGuildAdmin"], "La exportación de logros debe estar protegida");
requirePattern(/req\.session\.regenerate\(/, "La sesión debe regenerarse al autenticar para mitigar session fixation");

requirePattern(/app\.get\(["']\/api\/public\/status["']/, "Debe existir el endpoint público de estado de Bryvex Bot");
requirePattern(/PUBLIC_STATUS_CACHE_TTL = 30_000/, "El estado público debe limitar la frecuencia de comprobaciones externas");
requirePattern(/mongoose\.connection\.readyState !== 1/, "El estado debe comprobar la conexión real a MongoDB");
requirePattern(/discord\.com\/api\/v10\/users\/@me/, "El estado debe verificar la API de Discord");

for (const route of [
    ["put", "/api/account/settings", ["requireLogin", "requireCsrf"]],
    ["put", "/api/account/appearance", ["requireLogin", "requireCsrf"]],
    ["put", "/api/account/background", ["requireLogin", "requireCsrf"]],
    ["delete", "/api/account/background", ["requireLogin", "requireCsrf"]],
    ["put", "/api/guilds/:guildId/members/:userId/economy", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["put", "/api/guilds/:guildId/config/:module", ["requireLogin", "requireCsrf", "requireGuildModulePermission"]],
    ["get", "/api/guilds/:guildId/leaderboards/economy", ["requireGuildAdmin"]],
    ["get", "/api/guilds/:guildId/leaderboards/experience", ["requireGuildAdmin"]],
    ["get", "/api/guilds/:guildId/stats/overview", ["requireGuildAdmin"]],
    ["post", "/api/guilds/:guildId/polls", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["put", "/api/guilds/:guildId/polls/:pollId", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["delete", "/api/guilds/:guildId/polls/:pollId", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["post", "/api/guilds/:guildId/lists/:list", ["requireLogin", "requireCsrf", "requireGuildModulePermission"]],
    ["put", "/api/guilds/:guildId/lists/:list/:recordId", ["requireLogin", "requireCsrf", "requireGuildModulePermission"]],
    ["delete", "/api/guilds/:guildId/lists/:list/:recordId", ["requireLogin", "requireCsrf", "requireGuildModulePermission"]],
    ["post", "/api/support/tickets", ["requireLogin", "requireCsrf"]],
    ["post", "/api/support/tickets/:ticketId/messages", ["requireLogin", "requireCsrf"]],
    ["post", "/api/support/tickets/:ticketId/close", ["requireLogin", "requireCsrf"]],
    ["post", "/auth/logout", ["requireLogin", "requireCsrf"]]
]) {
    requireRoute(route[0], route[1], route[2], "Protección de ruta incompleta");
}

function requireClientPattern(pattern, message) {
    assert.match(clientSource, pattern, message);
}

requireClientPattern(/function assistantReply\(question\)/, "Debe existir el asistente de dashboard");
requireClientPattern(/const matched = findAssistantModule\(q\);[\s\S]*?const moduleQuestion = Boolean\(matched && matched\.score <= 2\);/, "Las consultas de módulos deben detectarse antes de responder con intenciones generales");
requireClientPattern(/href: "\/support"/, "El asistente debe conservar el destino del Centro de soporte");
requireClientPattern(/actionUrl:\s*assistantWebsitePageActions\.support\.href/, "Las consultas no reconocidas deben ofrecer acceso a Support");
requireClientPattern(/actionLabel:\s*assistantWebsitePageActions\.support\.label/, "El acceso a Support debe tener una etiqueta visible");
requireClientPattern(/actionKey === "__checks"/, "El asistente debe permitir abrir Comprobaciones");
requireClientPattern(/Prioridad alta|Revisión recomendada|Advertencia/, "Los diagnósticos deben comunicar niveles de prioridad");
requireClientPattern(/function getAssistantFindings\(/, "Deben existir comprobaciones automáticas de configuración");
requireClientPattern(/function getAssistantFieldGuidance\(/, "El asistente debe explicar campos de configuración");

assert.match(templateSource, /X-CSRF-Token/, "La importación de plantillas debe enviar el token CSRF");
assert.match(templateSource, /bryvex-bot-config-template/, "Las plantillas deben validar su formato");
assert.match(templateSource, /confirm\(warning\)/, "La importación de plantillas debe exigir confirmación explícita");
assert.match(leaderboardSource, /selectedType/, "La clasificación debe usar el tipo seleccionado");
assert.match(economyUserSource, /inventory:/, "La economía debe guardar el inventario del miembro");
assert.match(shopSource, /StoreItem/, "La tienda debe permitir comprar artículos además de roles");
assert.match(shopSource, /recordInventoryPurchase/, "Las compras deben guardarse en la mochila");
assert.match(achievementSource, /findOneAndUpdate[\s\S]*?unlockedAt/, "Los logros deben guardar el progreso y evitar desbloqueos duplicados");
assert.match(moduleSource, /title: "Artículos de tienda"/, "La dashboard debe permitir configurar artículos de venta");
assert.match(moduleSource, /title: "Trofeos - Logros"/, "La dashboard debe permitir configurar logros");
assert.match(clientSource, /member-backpack-item/, "La ficha de miembro debe mostrar los artículos comprados");
assert.match(clientSource, /member-achievement-item/, "La ficha de miembro debe mostrar el progreso de logros");
for (const file of ["hub.css", "hub.js", "status.html", "docs.html", "updates.html", "updates.js", "stats.html", "stats.js", "leaderboard.html", "leaderboard.js", "templates.html", "templates.js"]) {
    assert.ok(fs.existsSync(path.join(root, "dashboard", "public", file)), "Falta un recurso público de Bryvex Bot: " + file);
}


requirePattern(/async function resolveGuildDashboardAccess[\s\S]*?DashboardGuildPermission\.findOne/, "Los permisos delegados deben validarse con roles y miembros reales del servidor");
requirePattern(/function hasGuildModulePermission[\s\S]*?actions\?\.has\(action\)/, "Cada módulo debe comprobar la acción autorizada");
requirePattern(/function requireGuildModulePermission\(action = "view"\)/, "Las rutas de edición deben comprobar permisos específicos del módulo");
requirePattern(/app\.put\(["']\/api\/guilds\/:guildId\/permissions["'], requireLogin, requireCsrf, requireGuildAdmin/, "Solo los administradores pueden modificar las reglas de permisos");
requirePattern(/app\.post\(["']\/api\/guilds\/:guildId\/notifications["'], requireLogin, requireCsrf, requireGuildAdmin/, "Solo los administradores pueden publicar notificaciones");
requirePattern(/app\.get\(["']\/api\/guilds\/:guildId\/notifications["'], requireGuildNotificationAccess/, "El centro de notificaciones debe validar el acceso al servidor");
requirePattern(/app\.put\(["']\/api\/guilds\/:guildId\/notifications\/preferences["'], requireLogin, requireCsrf, requireGuildNotificationAccess/, "Las preferencias de notificación deben estar protegidas");
assert.match(clientSource, /function renderPermissionsCenter\(/, "Debe existir la interfaz de permisos avanzados");
assert.match(clientSource, /function renderNotificationCenter\(/, "Debe existir la interfaz del centro de notificaciones");
assert.match(clientSource, /data-save-permissions/, "Los permisos deben poder guardarse desde la dashboard");
assert.match(clientSource, /data-mark-read/, "Las notificaciones deben poder marcarse como leídas");
assert.match(moduleSource, /permissionsCenter:/, "La dashboard debe registrar el módulo de permisos");
assert.match(moduleSource, /notificationCenter:/, "La dashboard debe registrar el centro de notificaciones");

console.log("Dashboard security and assistant regression checks passed.");
