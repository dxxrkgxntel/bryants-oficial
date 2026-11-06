const Giveaway = require("../../Models/Giveaway");
const { editGiveawayMessage } = require("../../Functions/giveawayDraw");
const { trackAchievementProgress } = require("../../Functions/achievementTracker");

module.exports = {
    id: ["giveaway_enter:", "giveaway_leave:"],
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const [action, id] = interaction.customId.split(":");
        const filter = { _id: id, guildId: interaction.guildId, status: "active", endAt: { $gt: new Date() } };
        let giveaway;
        if (action === "giveaway_enter") {
            giveaway = await Giveaway.findOneAndUpdate(
                { ...filter, entrants: { $ne: interaction.user.id } },
                { $addToSet: { entrants: interaction.user.id, entryHistory: interaction.user.id } },
                { new: true }
            );
            if (!giveaway) {
                const current = await Giveaway.findOne(filter).select("entrants");
                return interaction.editReply(current?.entrants?.includes(interaction.user.id)
                    ? "Ya estás participando en este giveaway."
                    : "Este giveaway ya terminó o no está disponible.");
            }
            await trackAchievementProgress(interaction.guild, interaction.user, "giveaways_entered", 1)
                .catch(error => console.warn("[Achievements] No se pudo registrar giveaways_entered:", error.message));
        } else {
            giveaway = await Giveaway.findOneAndUpdate(
                { ...filter, entrants: interaction.user.id },
                { $pull: { entrants: interaction.user.id } },
                { new: true }
            );
            if (!giveaway) return interaction.editReply("No estás participando en este giveaway o ya terminó.");
        }
        await editGiveawayMessage(client, giveaway, false).catch(error => console.warn("[Giveaway] No pude actualizar el contador:", error.message));
        return interaction.editReply(action === "giveaway_enter" ? "¡Ya estás participando! Solo se permite una entrada por giveaway." : "Has salido del giveaway.");
    }
};
