const { trackAchievementProgress } = require("../../Functions/achievementTracker");
const { createMemberAchievementMetricTracker } = require("../../Functions/memberAchievementMetrics");

const trackMemberAchievementMetrics = createMemberAchievementMetricTracker({
    trackProgress: trackAchievementProgress
});

module.exports = {
    name: "guildMemberUpdate",
    async execute(oldMember, newMember) {
        if (!newMember?.guild || !newMember?.user || newMember.user.bot) return;
        await trackMemberAchievementMetrics(newMember.guild, newMember.user, newMember)
            .catch(error => console.warn("[Achievements] No se pudieron actualizar métricas de miembro:", error.message));
    }
};
