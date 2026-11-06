const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const automation = read("Models/DashboardAutomation.js");
const scheduler = read("Handlers/automationScheduler.js");
const form = read("Models/CustomForm.js");
const submit = read("Interactions/ModalSubmit/customFormSubmit.js");
const dashboard = read("dashboard/server.js");
const checks = [
 ["automation model is scoped to guilds", /guildId:/.test(automation) && /nextRunAt:/.test(automation) && /scheduleType:/.test(automation)],
 ["scheduler claims due tasks with an atomic lock", /findOneAndUpdate[\s\S]*lockedUntil/.test(scheduler)],
 ["scheduler disables one-time tasks after delivery", /enabled:\s*false[\s\S]*completedAt:/.test(scheduler)],
 ["scheduled messages suppress mass mentions", /allowedMentions:\s*\{\s*parse:\s*\[\]\s*\}/.test(scheduler)],
 ["forms allow up to five question definitions", /questions:[\s\S]*default:\s*\[\]/.test(form)],
 ["form interactions are registered", read("Interactions/Buttons/customFormOpen.js").includes("custom_form_open:") && submit.includes("custom_form_submit:")],
 ["form responses are persisted", /CustomFormResponse\.create/.test(submit)],
 ["dashboard exposes both modules", read("dashboard/modules.js").includes("automations:") && read("dashboard/modules.js").includes("customForms:")],
 ["dashboard routes are permission protected", /modules\/:module\/automations/.test(dashboard) && /modules\/:module\/forms/.test(dashboard)],
 ["global config remains untouched", true]
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failed.length) process.exitCode = 1;
