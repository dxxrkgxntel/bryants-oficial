function countOwnedStoreItems(inventory) {
    if (!Array.isArray(inventory)) return 0;
    return inventory.reduce((total, entry) => {
        if (!entry || (entry.type && entry.type !== "item")) return total;
        const rawQuantity = entry.quantity;
        const quantity = rawQuantity === undefined || rawQuantity === null
            ? 1
            : Number(rawQuantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return total;
        return total + Math.floor(quantity);
    }, 0);
}

function createInventoryAchievementMetricTracker({ trackProgress } = {}) {
    if (typeof trackProgress !== "function") {
        throw new TypeError("A trackProgress callback is required.");
    }
    return async function trackOwnedStoreItems(guild, user, inventory) {
        if (!guild?.id || !user?.id) return 0;
        const count = countOwnedStoreItems(inventory);
        if (count > 0) {
            await trackProgress(guild, user, "items_owned", count, { absolute: true });
        }
        return count;
    };
}

module.exports = { countOwnedStoreItems, createInventoryAchievementMetricTracker };
