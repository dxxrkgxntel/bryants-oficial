function getEconomyAchievementSnapshot(economyUser) {
    const wallet = Math.max(0, Number(economyUser?.wallet) || 0);
    const bank = Math.max(0, Number(economyUser?.bank) || 0);
    const debt = Math.max(0, Number(economyUser?.debt) || 0);

    return {
        coins: wallet,
        bank_balance: bank,
        net_worth: Math.max(0, wallet + bank - debt)
    };
}

async function trackEconomyAchievementSnapshot(guild, user, economyUser) {
    const { trackAchievementProgress } = require("./achievementTracker");
    const snapshot = getEconomyAchievementSnapshot(economyUser);
    const results = await Promise.allSettled(
        Object.entries(snapshot).map(([metric, value]) =>
            trackAchievementProgress(guild, user, metric, value, { absolute: true })
        )
    );

    for (const result of results) {
        if (result.status === "rejected") {
            console.warn("[Achievements] No se pudo actualizar el patrimonio:", result.reason?.message || result.reason);
        }
    }

    return snapshot;
}

module.exports = { getEconomyAchievementSnapshot, trackEconomyAchievementSnapshot };
