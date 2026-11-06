const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const { isValidSnowflake } = require("../Utils/dashboardNotifications");

assert.equal(isValidSnowflake("12345678901234567"), true, "Debe aceptar IDs Discord válidos");
assert.equal(isValidSnowflake("123"), false, "Debe rechazar IDs demasiado cortos");
assert.equal(isValidSnowflake("not-a-discord-id"), false, "Debe rechazar texto como ID");

const helperSource = fs.readFileSync(path.join(root, "Utils", "dashboardNotifications.js"), "utf8");
assert.match(helperSource, /DashboardNotification\.create/, "Los eventos del bot deben reutilizar el modelo del centro");
assert.match(helperSource, /targetUserIds: recipients/, "El servicio debe conservar los destinatarios opcionales");
assert.match(helperSource, /CATEGORIES/, "El servicio debe validar las categorías admitidas");
assert.match(helperSource, /SEVERITIES/, "El servicio debe validar las prioridades admitidas");
assert.match(helperSource, /Notification persistence must never interrupt/, "Un fallo de notificación no debe interrumpir el evento original");

const integrations = [
    ["Events/Moderation/raidDetection.js", /publishDashboardNotification[\s\S]*category:\s*"security"[\s\S]*severity:\s*"warning"/, "Las alertas de posible raid deben llegar al centro como seguridad"],
    ["Events/Messages/antiScam.js", /publishDashboardNotification[\s\S]*category:\s*"security"[\s\S]*severity:\s*"critical"/, "Las detecciones de scam deben generar una alerta crítica"],
    ["Events/Logs/guildBanAdd.js", /publishDashboardNotification[\s\S]*category:\s*"security"/, "Los baneos deben generar una notificación de moderación"],
    ["Events/Logs/guildMemberUpdate.js", /publishDashboardNotification[\s\S]*category:\s*"security"/, "Los timeouts deben generar una notificación de moderación"],
    ["Events/Logs/guildMemberRemove.js", /publishDashboardNotification[\s\S]*category:\s*"security"/, "Las expulsiones deben generar una notificación de moderación"]
];

for (const [relativePath, pattern, message] of integrations) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    assert.match(source, /require\(["'].*dashboardNotifications["']\)/, relativePath + " debe usar el servicio compartido");
    assert.match(source, pattern, message);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert.match(packageJson.scripts.test, /check-notification-events\.js/, "La prueba de integración debe ejecutarse en CI");

console.log("Bot notification event integration checks passed.");
