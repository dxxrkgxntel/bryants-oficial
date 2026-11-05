function addCalendarMonthsClamped(date, months) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(date.getUTCDate(), lastDay);
    return new Date(Date.UTC(
        year,
        month,
        day,
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds()
    ));
}

function completedCalendarMonths(startValue, nowValue = Date.now()) {
    if (startValue === null || startValue === undefined) return null;
    const start = startValue instanceof Date ? startValue : new Date(startValue);
    const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(now.getTime()) || now < start) return null;
    let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12
        + now.getUTCMonth() - start.getUTCMonth();
    if (now < addCalendarMonthsClamped(start, months)) months -= 1;
    return Math.max(0, months);
}

function createBoostAchievementMetricTracker({ model, trackProgress } = {}) {
    if (!model || typeof model.findOneAndUpdate !== "function" || typeof trackProgress !== "function") {
        throw new TypeError("Boost persistence and progress callbacks are required.");
    }
    const reported = new Map();

    return async function trackBoostAchievementMetric(guild, member, premiumSince = member?.premiumSince, now = Date.now()) {
        const user = member?.user;
        if (!guild?.id || !user?.id) return 0;
        const months = completedCalendarMonths(premiumSince, now);
        if (months === null || months <= 0) return months ?? 0;

        const key = guild.id + ":" + user.id;
        const cached = reported.get(key) ?? -1;
        if (months <= cached) return cached;

        const query = model.findOneAndUpdate(
            { guildId: guild.id, userId: user.id },
            {
                $max: { bestMonths: months },
                $setOnInsert: { guildId: guild.id, userId: user.id }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        const stats = query && typeof query.lean === "function" ? await query.lean() : await query;
        const bestMonths = Math.max(months, Number(stats?.bestMonths || 0));
        if (bestMonths > cached) {
            await trackProgress(guild, user, "boost_months", bestMonths, { absolute: true });
            reported.set(key, bestMonths);
            if (reported.size > 20000) reported.delete(reported.keys().next().value);
        }
        return bestMonths;
    };
}

let runtimeTracker;
async function trackBoostAchievementMetric(guild, member, premiumSince = member?.premiumSince, now = Date.now()) {
    if (!runtimeTracker) {
        const BoostAchievementStats = require("../Models/BoostAchievementStats");
        const { trackAchievementProgress } = require("./achievementTracker");
        runtimeTracker = createBoostAchievementMetricTracker({
            model: BoostAchievementStats,
            trackProgress: trackAchievementProgress
        });
    }
    return runtimeTracker(guild, member, premiumSince, now);
}

module.exports = {
    addCalendarMonthsClamped,
    completedCalendarMonths,
    createBoostAchievementMetricTracker,
    trackBoostAchievementMetric
};
