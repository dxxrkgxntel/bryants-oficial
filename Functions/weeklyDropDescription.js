const { renderConfiguredMessage } = require("./renderConfiguredMessage");

function renderWeeklyDropDescription(config, usersRewarded, totalCoins, now = Date.now()) {
    if (!config?.description) return "";
    const nextDropTime = config.nextDrop ? new Date(config.nextDrop).getTime() : NaN;
    const daysUntilDrop = Number.isFinite(nextDropTime)
        ? Math.max(0, Math.ceil((nextDropTime - now) / 86400000))
        : "";
    const nextDrop = Number.isFinite(nextDropTime)
        ? `<t:${Math.floor(nextDropTime / 1000)}:R>`
        : "";

    return renderConfiguredMessage(config.description, {
        users_rewarded: Number(usersRewarded || 0).toLocaleString("es"),
        total_coins: Number(totalCoins || 0).toLocaleString("es"),
        days_until_drop: daysUntilDrop,
        next_drop: nextDrop
    });
}

module.exports = { renderWeeklyDropDescription };
