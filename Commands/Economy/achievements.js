const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require("discord.js");
const Achievement = require("../../Models/Achievement");
const UserAchievement = require("../../Models/UserAchievement");
const achievementCategoryLabels = require("../../data/locales/achievement-categories.es.json").categories;
const { ensureDefaultAchievements } = require("../../Functions/achievementTracker");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("achievements")
        .setDescription("Consulta tus logros y tu progreso")
        .addUserOption(option => option.setName("usuario").setDescription("Miembro cuyos logros quieres consultar").setRequired(false))
        .addIntegerOption(option => option.setName("pagina").setDescription("Página del catálogo (10 logros por página)").setMinValue(1).setMaxValue(50).setRequired(false)),
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
        const visibleDefinitions = definitions.filter(item => !item.secret || progressById.get(item.achievementId)?.unlockedAt);
        const pageSize = 10;
        const totalPages = Math.max(1, Math.ceil(visibleDefinitions.length / pageSize));
        const page = Math.min(interaction.options.getInteger("pagina") || 1, totalPages);
        const pageItems = visibleDefinitions.slice((page - 1) * pageSize, page * pageSize);
        const lines = pageItems.map(item => {
            const entry = progressById.get(item.achievementId);
            const done = Boolean(entry?.unlockedAt);
            const current = Math.min(item.goal, entry?.progress || 0);
            const rewards = [
                item.rewardCoins > 0 ? `💰 ${item.rewardCoins.toLocaleString()}` : "",
                item.rewardXP > 0 ? `✨ ${item.rewardXP.toLocaleString()} XP` : ""
            ].filter(Boolean);
            const reward = rewards.length ? ` · ${rewards.join(" · ")}` : "";
            return `${done ? "🏆" : "🔒"} ${item.emoji || "🏆"} **${item.name}** · _${achievementCategoryLabels[item.category] || item.category}_ — ${done ? "Desbloqueado" : `${current.toLocaleString()}/${item.goal.toLocaleString()}`}\n> ${item.description}${reward}`;
        });
        const container = new ContainerBuilder().setAccentColor(0x8A2BE2);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🏆 Logros de ${target.username}`));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Desbloqueados: **${unlocked.length}/${definitions.length}** · Página **${page}/${totalPages}**\n\n${lines.join("\n\n")}${totalPages > 1 ? "\n\n_Usa la opción pagina para consultar el resto del catálogo._" : ""}`));
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
};
