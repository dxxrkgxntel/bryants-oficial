const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "audit-achievement-catalog.js"), "utf8");

assert.match(source, /mode:\s*"READ_ONLY"/);
assert.match(source, /process\.env\.MONGODB_URI/);
assert.match(source, /process\.env\.DATABASE_URL/);
assert.match(source, /secondaryPreferred/);
assert.match(source, /EXPECTED_COUNT\s*=\s*397/);
assert.match(source, /Achievement\.distinct/);
assert.match(source, /missingIds/);
assert.match(source, /unexpectedIds/);
assert.match(source, /duplicateAchievementIds/);
assert.match(source, /metadataDifferenceCount/);
assert.match(source, /notoqCatalogLocaleVersion/);
assert.match(source, /UserAchievement\.aggregate/);
assert.match(source, /pointsEarned/);
assert.match(source, /unlockedLevels/);
assert.match(source, /\$isArray/);
assert.match(source, /checks\.seeded/);
assert.match(source, /mongoose\.disconnect/);
assert.match(source, /require\.main\s*===\s*module/);


const trackerSource = fs.readFileSync(path.join(__dirname, "..", "Functions", "achievementTracker.js"), "utf8");
assert.match(trackerSource, /legacyNotoqCollisions/, "Los IDs heredados que colisionan deben reconciliarse con el catálogo Notoq.");
assert.match(trackerSource, /source:\s*\{\s*\$ne:\s*"notoq"\s*\}/, "La reconciliación solo debe actualizar definiciones que aún no sean Notoq.");
assert.match(trackerSource, /\$set:\s*\{\s*\.\.\.item,\s*guildId\s*\}/, "La reconciliación debe convertir el documento existente sin crear duplicados.");
assert.match(trackerSource, /await Promise\.all\(legacyNotoqCollisions\.map\(/, "La reconciliación debe ejecutarse durante la inicialización del catálogo.");

const dashboardSource = fs.readFileSync(path.join(__dirname, "..", "dashboard", "server.js"), "utf8");
const dashboardClientSource = fs.readFileSync(path.join(__dirname, "..", "dashboard", "public", "server.js"), "utf8");
assert.ok(dashboardSource.includes('app.get("/api/guilds/:guildId/achievements/audit-spanish", requireGuildAdmin'), "La dashboard debe exponer la auditoría protegida por permisos de administrador.");
const routeStart = dashboardSource.indexOf('app.get("/api/guilds/:guildId/achievements/audit-spanish"');
const routeEnd = dashboardSource.indexOf('app.get("/api/guilds/:guildId/achievements/export"', routeStart);
assert.ok(routeStart >= 0 && routeEnd > routeStart, "La ruta de auditoría debe estar delimitada.");
const auditRouteSource = dashboardSource.slice(routeStart, routeEnd);
assert.ok(auditRouteSource.includes("Achievement.find("), "La auditoría debe consultar las definiciones.");
assert.ok(auditRouteSource.includes("Achievement.aggregate("), "La auditoría debe detectar duplicados.");
assert.ok(auditRouteSource.includes("UserAchievement.aggregate("), "La auditoría debe calcular el progreso guardado.");
assert.ok(auditRouteSource.includes("TrophySettings.findOne("), "La auditoría debe consultar el estado de la migración.");
for (const writeMethod of [".create(", ".insertMany(", ".updateOne(", ".updateMany(", ".findOneAndUpdate(", ".bulkWrite(", ".deleteOne(", ".deleteMany(", ".save("]) {
    assert.ok(!auditRouteSource.includes(writeMethod), "La ruta de auditoría no debe ejecutar " + writeMethod);
}
assert.match(dashboardClientSource, /achievement-spanish-audit-trigger/, "Trofeos debe mostrar la acción de auditoría.");
assert.ok(dashboardClientSource.includes("/achievements/audit-spanish"), "La dashboard debe consultar el endpoint de auditoría.");
assert.match(dashboardClientSource, /AUDITORÍA DE SOLO LECTURA/, "El panel debe identificar la auditoría como solo lectura.");

console.log("Read-only achievement catalog audit checks passed.");
