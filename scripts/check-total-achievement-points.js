const assert = require("node:assert/strict");
const UserAchievement = require("../Models/UserAchievement");
const {
    buildTotalAchievementPointsPipeline,
    getTotalAchievementPoints
} = require("../Functions/achievementTracker");

const expectedPipeline = [
    { $match: { guildId: "guild-1", userId: "user-1" } },
    { $group: { _id: null, totalPoints: { $sum: "$pointsEarned" } } }
];
assert.deepEqual(buildTotalAchievementPointsPipeline("guild-1", "user-1"), expectedPipeline);

(async () => {
    const originalAggregate = UserAchievement.aggregate;
    try {
        UserAchievement.aggregate = async pipeline => {
            assert.deepEqual(pipeline, expectedPipeline);
            return [{ totalPoints: 525 }];
        };
        assert.equal(await getTotalAchievementPoints("guild-1", "user-1"), 525);
        UserAchievement.aggregate = async () => [];
        assert.equal(await getTotalAchievementPoints("guild-1", "user-1"), 0);
    } finally {
        UserAchievement.aggregate = originalAggregate;
    }
    console.log("Total achievement points regression checks passed.");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
