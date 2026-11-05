const assert = require("assert");
const {
    countOwnedStoreItems,
    createInventoryAchievementMetricTracker
} = require("../Functions/inventoryAchievementMetrics");

async function run() {
    assert.strictEqual(countOwnedStoreItems(null), 0);
    assert.strictEqual(countOwnedStoreItems([
        { itemId: "potion", type: "item", quantity: 4 },
        { itemId: "badge", type: "item", quantity: 2 },
        { itemId: "role:123", type: "role", quantity: 1 },
        { itemId: "legacy", quantity: 3 },
        { itemId: "empty", type: "item", quantity: 0 }
    ]), 9);

    const calls = [];
    const track = createInventoryAchievementMetricTracker({
        trackProgress: async (...args) => calls.push(args)
    });
    assert.strictEqual(await track({ id: "guild-1" }, { id: "user-1" }, [
        { itemId: "potion", type: "item", quantity: 4 },
        { itemId: "role:123", type: "role", quantity: 1 }
    ]), 4);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0][2], "items_owned");
    assert.strictEqual(calls[0][3], 4);
    assert.strictEqual(calls[0][4]?.absolute, true);
    assert.strictEqual(await track({ id: "guild-1" }, { id: "user-1" }, []), 0);
    assert.strictEqual(calls.length, 1);

    console.log("Inventory ownership achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
