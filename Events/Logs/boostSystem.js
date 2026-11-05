const { sendBoostNotification } = require("../../Functions/boostNotification");
const boostSchema = require("../../Models/boostSchema");
const { trackAchievementProgress } = require("../../Functions/achievementTracker");

module.exports = {
    name: "guildMemberUpdate",
    async execute(oldMember, newMember) {
        try {
            if (oldMember.premiumSince || !newMember.premiumSince) return;
            await trackAchievementProgress(newMember.guild, newMember.user, "boosts", 1)
                .catch(error => console.warn("[Achievements] No se pudo registrar boosts:", error.message));
            const data = await boostSchema.findOne({ guildId: newMember.guild.id }).lean();
            if (!data?.boostChannel) return;
            const channel = newMember.guild.channels.cache.get(data.boostChannel);
            if (!channel?.isTextBased()) return;
            await sendBoostNotification(channel, data, newMember.guild, newMember);
        } catch (error) {
            console.error("[Boost] No se pudo enviar el mensaje configurado:", error);
        }
    }
};
