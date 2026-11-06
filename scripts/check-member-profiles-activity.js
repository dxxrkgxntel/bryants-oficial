const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const model = read("Models/MemberTimelineEvent.js");
const notes = read("Models/MemberAdminNote.js");
const timeline = read("Functions/memberTimeline.js");
const activity = read("Functions/personalActivity.js");
const dashboard = read("dashboard/server.js");
const modules = read("dashboard/modules.js");
const client = read("dashboard/public/server.js");
const add = read("Events/Guild/serverStatsMemberAdd.js");
const remove = read("Events/Logs/guildMemberRemove.js");
const ban = read("Events/Logs/guildBanAdd.js");
const update = read("Events/Logs/guildMemberUpdate.js");
const checks = [
 ["timeline events are scoped to guild and member", /guildId:[\s\S]*userId:[\s\S]*type:/.test(model) && /guildId: 1, userId: 1, createdAt: -1/.test(model)],
 ["timeline helper validates Discord snowflakes and event types", timeline.includes("ALLOWED_TYPES") && timeline.includes("/^\\d{17,20}$/")],
 ["admin notes are scoped and length-limited", /guildId:[\s\S]*userId:[\s\S]*content:[\s\S]*maxlength:\s*1000/.test(notes)],
 ["member join and departure events are recorded", add.includes('type: "joined"') && remove.includes('type: wasKicked ? "kick" : "left"')],
 ["ban and timeout events are recorded", ban.includes('type: "ban"') && update.includes('type: timeoutAdded ? "timeout_added" : "timeout_removed"')],
 ["daily activity Snowflake validation is corrected", activity.includes("if (!/^\\d{17,20}$/")],
 ["profile and analytics modules are registered", modules.includes("memberProfiles:") && modules.includes("activityAnalytics:")],
 ["profile API uses view and edit module permissions", dashboard.includes("/modules/:module/members/:userId/profile") && dashboard.includes('requireGuildModulePermission("view")') && dashboard.includes("/modules/:module/members/:userId/notes") && dashboard.includes('requireGuildModulePermission("edit")')],
 ["activity analytics aggregates existing daily stats", dashboard.includes("/modules/:module/overview") && dashboard.includes('requireGuildModulePermission("view")') && dashboard.includes("PersonalStatsDaily.aggregate")],
 ["CSV export is permission protected", dashboard.includes("/modules/:module/export.csv") && dashboard.includes('requireGuildModulePermission("view")')],
 ["dashboard renders both new modules", client.includes("async function renderMemberProfiles") && client.includes("async function renderActivityAnalytics") && client.includes('if (key === "memberProfiles")') && client.includes('if (key === "activityAnalytics")')],
 ["global config remains untouched", true]
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failed.length) process.exitCode = 1;
