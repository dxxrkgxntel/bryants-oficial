const mongoose = require("mongoose");
const Giveaway = require("../Models/Giveaway");
const { finishGiveaway } = require("./giveawayDraw");

module.exports = function startAutoGiveawayEnd(client, { intervalMs = 15_000 } = {}) {
    let running = false;
    const run = async () => {
        if (running || mongoose.connection.readyState !== 1) return;
        running = true;
        try {
            const due = await Giveaway.find({ status: "active", endAt: { $lte: new Date() } }).select("_id").limit(100).lean();
            for (const item of due) {
                try { await finishGiveaway(client, String(item._id)); }
                catch (error) { console.error("[Giveaway] Error al finalizar sorteo:", item._id, error.message); }
            }
        } catch (error) {
            console.error("[Giveaway] Error en el scheduler:", error.message);
        } finally { running = false; }
    };
    run();
    const timer = setInterval(run, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return () => clearInterval(timer);
};
