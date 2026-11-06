const Giveaway = require("../../Models/Giveaway");
const { editGiveawayMessage } = require("../../Functions/giveawayDraw");

module.exports = {
    id: ["giveaway_enter:", "giveaway_leave:"],
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const [action, id] = interaction.customId.split(":");
        const filter = { _id: id, guildId: interaction.guildId, status: "active", endAt: { $gt: new Date() } };
        const update = action === "giveaway_enter" ? { $addToSet: { entrants: interaction.user.id } } : { $pull: { entrants: interaction.user.id } };
        const giveaway = await Giveaway.findOneAndUpdate(filter, update, { new: true });
        if (!giveaway) return interaction.editReply("Este giveaway ya terminó o no está disponible.");
        await editGiveawayMessage(client, giveaway, false).catch(error => console.warn("[Giveaway] No pude actualizar el contador:", error.message));
        return interaction.editReply(action === "giveaway_enter" ? "¡Ya estás participando! Solo se permite una entrada por usuario." : "Has salido del giveaway.");
    }
};
