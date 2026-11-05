const assert = require("node:assert/strict");
const { getTotalAchievementPoints } = require("../Functions/achievementTracker");

assert.equal(typeof getTotalAchievementPoints, "function");

console.log("Total achievement points integration exports are available.");
