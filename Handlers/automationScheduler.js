const cron = require("node-cron");
const DashboardAutomation = require("../Models/DashboardAutomation");
const { publishDashboardNotification } = require("../Utils/dashboardNotifications");

async function runDueAutomations(client) {
 const now = new Date();
 const due = await DashboardAutomation.find({
  enabled: true,
  nextRunAt: { $lte: now },
  $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }]
 }).sort({ nextRunAt: 1 }).limit(20).select("_id").lean();
 for (const item of due) {
  const lockUntil = new Date(Date.now() + 120000);
  const task = await DashboardAutomation.findOneAndUpdate({
   _id: item._id, enabled: true, nextRunAt: { $lte: now },
   $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }]
  }, { $set: { lockedUntil: lockUntil } }, { new: true });
  if (!task) continue;
  try {
   const channel = await client.channels.fetch(task.channelId);
   if (!channel || channel.guildId !== task.guildId || !channel.isTextBased() || !channel.send) {
    throw new Error("El canal configurado ya no está disponible o no admite mensajes.");
   }
   await channel.send({ content: task.message, allowedMentions: { parse: [] } });
   const interval = task.scheduleType === "interval" ? Math.max(5, Number(task.intervalMinutes) || 5) : 0;
   await DashboardAutomation.updateOne({ _id: task._id, lockedUntil: lockUntil }, { $set: {
    lastRunAt: new Date(), lastError: null, lockedUntil: null,
    ...(interval ? { nextRunAt: new Date(Date.now() + interval * 60000) } : { enabled: false, completedAt: new Date() })
   } });
   await publishDashboardNotification({ guildId: task.guildId, title: "Automatización ejecutada", message: "Se ejecutó «" + task.name + "» correctamente.", category: "system", severity: "success" });
  } catch (error) {
   await DashboardAutomation.updateOne({ _id: task._id, lockedUntil: lockUntil }, { $set: { lockedUntil: null, lastError: String(error.message || error).slice(0, 500) } });
   console.error("[Automations] Error ejecutando " + task.name + ":", error.message);
  }
 }
}

function startAutomationScheduler(client) {
 if (!client || client.automationSchedulerStarted) return;
 client.automationSchedulerStarted = true;
 cron.schedule("* * * * *", () => runDueAutomations(client).catch(error => console.error("[Automations] Scheduler:", error)));
 runDueAutomations(client).catch(error => console.error("[Automations] Inicio:", error));
 console.log("[Automations] Scheduler iniciado.");
}
module.exports = { startAutomationScheduler, runDueAutomations };
