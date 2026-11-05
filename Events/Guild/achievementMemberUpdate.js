const { trackAchievementProgress } = require("../../Functions/achievementTracker");
const { createMemberAchievementMetricTracker } = require("../../Functions/memberAchievementMetrics");
const { trackBoostAchievementMetric } = require("../../Functions/boostAchievementMetrics");

const trackMemberAchievementMetrics = createMemberAchievementMetricTracker({
    trackProgress: trackAchievementProgress
});

module.exports = {
    name: "guildMemberUpdate",
    async execute(oldMember, newMember) {
        if (!newMember?.guild || !newMember?.user || newMember.user.bot) return;
        await trackMemberAchievementMetrics(newMember.guild, newMember.user, newMember)
            .catch(error => console.warn("[Achievements] No se pudieron actualizar métricas de miembro:", error.message));
        await trackBoostAchievementMetric(newMember.guild, newMember, newMember.premiumSince || oldMember?.premiumSince)
            .catch(error => console.warn("[Achievements] No se pudo actualizar boost_months:", error.message));
    }
};
