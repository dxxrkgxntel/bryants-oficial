const PersonalActivity = require("../Models/PersonalActivity");
const { activityDayKeys } = require("./activityMath");

async function recordDailyActivity(userId, guildId, date = new Date()) {
    if (!/^\\d{17,20}$/.test(String(userId || "")) || !/^\\d{17,20}$/.test(String(guildId || ""))) return null;
    const currentDate = new Date(date);
    if (!Number.isFinite(currentDate.getTime())) return null;

    const dayKeys = activityDayKeys(currentDate);
    if (!dayKeys) return null;
    const { today, yesterday } = dayKeys;

    const daysActive = {
        $add: [
            { $ifNull: ["$daysActive", 0] },
            { $cond: [{ $eq: ["$lastActiveDay", today] }, 0, 1] }
        ]
    };
    const currentStreak = {
        $cond: [
            { $eq: ["$lastActiveDay", today] },
            { $ifNull: ["$currentStreak", 0] },
            { $cond: [{ $eq: ["$lastActiveDay", yesterday] }, { $add: [{ $ifNull: ["$currentStreak", 0] }, 1] }, 1] }
        ]
    };
    const bestStreak = {
        $max: [{ $ifNull: ["$bestStreak", 0] }, currentStreak]
    };

    return PersonalActivity.findOneAndUpdate(
        { userId: String(userId), guildId: String(guildId) },
        [{
            $set: {
                userId: String(userId),
                guildId: String(guildId),
                daysActiveProgressDelta: { $max: [0, { $subtract: [daysActive, { $ifNull: ["$daysActiveReported", 0] }] }] },
                bestStreakProgressDelta: { $max: [0, { $subtract: [bestStreak, { $ifNull: ["$bestStreakReported", 0] }] }] },
                daysActive: daysActive,
                currentStreak: currentStreak,
                bestStreak: bestStreak,
                daysActiveReported: daysActive,
                bestStreakReported: bestStreak,
                lastActiveDay: today
            }
        }],
        { upsert: true, new: true }
    ).lean();
}

module.exports = { recordDailyActivity };
