const DAY_MS = 86400000;

function wholeDaysSince(value, now = Date.now()) {
    const start = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(now)) return null;
    return Math.max(0, Math.floor((now - start) / DAY_MS));
}

function getAssignableRoleCount(member) {
    const roles = member?.roles?.cache;
    if (!roles || typeof roles.values !== "function") return null;
    let count = 0;
    for (const role of roles.values()) {
        if (!role || role.id === member.guild?.id || role.managed) continue;
        count += 1;
    }
    return count;
}

function buildMemberAchievementMetrics({ user, member, now = Date.now() } = {}) {
    const metrics = {};
    const accountAge = wholeDaysSince(user?.createdAt, now);
    const membershipAge = wholeDaysSince(member?.joinedAt, now);
    const rolesCount = getAssignableRoleCount(member);
    if (accountAge !== null) metrics.account_age_days = accountAge;
    if (membershipAge !== null) metrics.membership_days = membershipAge;
    if (rolesCount !== null) metrics.roles_count = rolesCount;
    return metrics;
}

function createMemberAchievementMetricTracker({ trackProgress } = {}) {
    if (typeof trackProgress !== "function") {
        throw new TypeError("A trackProgress callback is required.");
    }
    return async function trackMemberAchievementMetrics(guild, user, member, now = Date.now()) {
        if (!guild?.id || !user?.id) return {};
        const metrics = buildMemberAchievementMetrics({ user, member, now });
        for (const [metric, value] of Object.entries(metrics)) {
            if (value <= 0) continue;
            await trackProgress(guild, user, metric, value, { absolute: true });
        }
        return metrics;
    };
}

module.exports = {
    DAY_MS,
    wholeDaysSince,
    getAssignableRoleCount,
    buildMemberAchievementMetrics,
    createMemberAchievementMetricTracker
};
