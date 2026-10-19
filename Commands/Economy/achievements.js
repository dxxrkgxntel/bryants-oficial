const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");
const Achievement = require("../../Models/Achievement");
const UserAchievement = require("../../Models/UserAchievement");
const { ensureDefaultAchievements } = require("../../Functions/achievementTracker");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("achievements")
        .setDescription("Consulta tus logros y tu progreso")
        .addUserOption(option => option.setName("usuario").setDescription("Miembro cuyos logros quieres consultar").setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser("usuario") || interaction.user;
        await ensureDefaultAchievements(interaction.guild.id);
        const [definitions, progress] = await Promise.all([
            Achievement.find({ guildId: interaction.guild.id, enabled: true }).sort({ category: 1, goal: 1, name: 1 }).lean(),
            UserAchievement.find({ guildId: interaction.guild.id, userId: target.id }).lean()
        ]);
        if (!definitions.length) {
            return interaction.editReply({ content: "🏆 Todavía no hay logros configurados para este servidor. El equipo de administración puede crearlos desde la dashboard." });
        }

        const progressById = new Map(progress.map(entry => [entry.achievementId, entry]));
        const unlocked = definitions.filter(item => progressById.get(item.achievementId)?.unlockedAt);
        const lines = definitions.slice(0, 20).map(item => {
            const entry = progressById.get(item.achievementId);
            const done = Boolean(entry?.unlockedAt);
            const current = Math.min(item.goal, entry?.progress || 0);
            const reward = item.rewardCoins > 0 ? ` · 💰 ${item.rewardCoins.toLocaleString()}` : "";
            return `${done ? "🏆" : "🔒"} ${item.emoji || "🏆"} **${item.name}** — ${done ? "Desbloqueado" : `${current.toLocaleString()}/${item.goal.toLocaleString()}`}\n> ${item.description}${reward}`;
        });
        const container = new ContainerBuilder().setAccentColor(0x8A2BE2);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🏆 Logros de ${target.username}`));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Desbloqueados: **${unlocked.length}/${definitions.length}**\n\n${lines.join("\n\n")}${definitions.length > 20 ? "\n\n_Muestra limitada a los primeros 20 logros. Configura categorías para organizar el catálogo._" : ""}`));
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};
