const assert = require("node:assert/strict");
const path = require("node:path");

let wallet = 100;
const modelPath = path.join(__dirname, "../Models/EconomyUser.js");
require.cache[modelPath] = {
    id: modelPath,
    filename: modelPath,
    loaded: true,
    exports: {
        async findOneAndUpdate(filter, update) {
            if (filter.wallet && wallet < filter.wallet.$gte) return null;
            wallet += update.$inc.wallet;
            return { guildId: filter.guildId, userId: filter.userId, wallet };
        },
        async findOne() {
            return { wallet };
        }
    }
};

const {
    reserveBlackjackBet,
    releaseBlackjackBet,
    settleBlackjackBet
} = require("../Functions/blackjackEconomy");

async function run() {
    const identity = { guildId: "guild-a", userId: "user-a" };
    const reservations = await Promise.all([
        reserveBlackjackBet({ ...identity, amount: 80 }),
        reserveBlackjackBet({ ...identity, amount: 80 })
    ]);
    assert.equal(reservations.filter(Boolean).length, 1, "concurrent bets cannot reserve the same wallet funds");
    assert.equal(wallet, 20);

    await settleBlackjackBet({ ...identity, amount: 80, result: "loss" });
    assert.equal(wallet, 20, "a loss consumes the amount already reserved");
    await releaseBlackjackBet({ ...identity, amount: 80 });
    assert.equal(wallet, 100, "rollback after a failed game-message delivery releases the reservation");

    await reserveBlackjackBet({ ...identity, amount: 40 });
    await settleBlackjackBet({ ...identity, amount: 40, result: "win" });
    assert.equal(wallet, 140, "a win returns the stake and pays an equal net win");
    await reserveBlackjackBet({ ...identity, amount: 20 });
    await settleBlackjackBet({ ...identity, amount: 20, result: "draw" });
    assert.equal(wallet, 140, "a draw returns the reserved stake");

    assert.equal(await reserveBlackjackBet({ ...identity, amount: 1000 }), null);
    assert.equal(await reserveBlackjackBet({ ...identity, amount: 0 }), null);
    console.log("Blackjack economy tests passed: atomic concurrent reservations, loss, win, draw and rollback.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
