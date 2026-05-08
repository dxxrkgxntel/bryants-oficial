const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Level = require("../../Models/Level");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard-nivel")
        .setDescription("Top de niveles del servidor"),

    async execute(interaction) {

        const data = await Level.find({ guildId: interaction.guild.id })
            .sort({ level: -1, xp: -1 })
            .limit(10);

        if (!data.length) {
            return interaction.reply("❌ No hay datos aún");
        }

        const leaderboard = data.map((user, i) => {
            return `**${i + 1}.** <@${user.userId}> — Nivel **${user.level}** (${user.xp} XP)`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setTitle("🏆 Leaderboard del servidor")
            .setDescription(leaderboard)
            .setColor("#8A2BE2")
            .setFooter({ text: "Top 10 usuarios" });

        interaction.reply({ embeds: [embed] });
    }
};