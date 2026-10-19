const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "dashboard", "server.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "dashboard", "public", "server.js"), "utf8");
const templateSource = fs.readFileSync(path.join(root, "dashboard", "public", "templates.js"), "utf8");
const leaderboardSource = fs.readFileSync(path.join(root, "dashboard", "public", "leaderboard.js"), "utf8");

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
requirePattern(/function requireCsrf\([\s\S]*?crypto\.timingSafeEqual/, "Las escrituras deben poder protegerse con CSRF");
requirePattern(/function secureStringEqual\([\s\S]*?crypto\.timingSafeEqual/, "Las comparaciones de secretos deben ser seguras");
requirePattern(/!secureStringEqual\(state, expectedState\)/, "OAuth debe validar state con comparación segura");
requirePattern(/app\.disable\("x-powered-by"\)/, "Express no debe revelar su cabecera de identificación");
requirePattern(/app\.use\(helmet\(/, "Deben activarse cabeceras de seguridad HTTP");
requirePattern(/express\.json\(\{\s*limit:\s*"32kb"/, "El cuerpo JSON debe tener un límite de tamaño");
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
    ["put", "/api/guilds/:guildId/config/:module", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["get", "/api/guilds/:guildId/leaderboards/economy", ["requireGuildAdmin"]],
    ["get", "/api/guilds/:guildId/leaderboards/experience", ["requireGuildAdmin"]],
    ["get", "/api/guilds/:guildId/stats/overview", ["requireGuildAdmin"]],
    ["post", "/api/guilds/:guildId/polls", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["put", "/api/guilds/:guildId/polls/:pollId", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["delete", "/api/guilds/:guildId/polls/:pollId", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["post", "/api/guilds/:guildId/lists/:list", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["put", "/api/guilds/:guildId/lists/:list/:recordId", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
    ["delete", "/api/guilds/:guildId/lists/:list/:recordId", ["requireLogin", "requireCsrf", "requireGuildAdmin"]],
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
requireClientPattern(/actionUrl: "\/support"/, "Las consultas no reconocidas deben ofrecer acceso a Support");
requireClientPattern(/actionKey === "__checks"/, "El asistente debe permitir abrir Comprobaciones");
requireClientPattern(/Prioridad alta|Revisión recomendada|Advertencia/, "Los diagnósticos deben comunicar niveles de prioridad");
requireClientPattern(/function getAssistantFindings\(/, "Deben existir comprobaciones automáticas de configuración");
requireClientPattern(/function getAssistantFieldGuidance\(/, "El asistente debe explicar campos de configuración");

assert.match(templateSource, /X-CSRF-Token/, "La importación de plantillas debe enviar el token CSRF");
assert.match(templateSource, /bryvex-bot-config-template/, "Las plantillas deben validar su formato");
assert.match(templateSource, /confirm\(warning\)/, "La importación de plantillas debe exigir confirmación explícita");
assert.match(leaderboardSource, /leaderboards\/\+selectedType/, "La clasificación debe usar el tipo seleccionado");
for (const file of ["hub.css", "hub.js", "status.html", "docs.html", "updates.html", "updates.js", "stats.html", "stats.js", "leaderboard.html", "leaderboard.js", "templates.html", "templates.js"]) {
    assert.ok(fs.existsSync(path.join(root, "dashboard", "public", file)), "Falta un recurso público de Bryvex Bot: " + file);
}

console.log("Dashboard security and assistant regression checks passed.");
