const { SlashCommandBuilder } = require("discord.js");
const Level = require("../../Models/Level");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Ver nivel y XP de un usuario")
        .addUserOption(option =>
            option.setName("usuario")
                .setDescription("Usuario")
                .setRequired(false)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("usuario") || interaction.user;

        const data = await Level.findOne({
            userId: user.id,
            guildId: interaction.guild.id
        });

        if (!data) return interaction.reply("❌ No tiene nivel");

        const xpNeeded = (data.level + 1) * 100;

        // 🏆 calcular posición (top)
        const leaderboard = await Level.find({ guildId: interaction.guild.id })
            .sort({ level: -1, xp: -1 });

        const position = leaderboard.findIndex(u => u.userId === user.id) + 1;

        // 🎨 colores dinámicos
        let color = "8000ff"; // default
        if (position === 1) color = "ffd700"; // oro
        else if (position === 2) color = "c0c0c0"; // plata
        else if (position === 3) color = "cd7f32"; // bronce

        // 🏆 badge
        let badge = "";
        if (position === 1) badge = "👑 TOP 1";
        else if (position === 2) badge = "🥈 TOP 2";
        else if (position === 3) badge = "🥉 TOP 3";

        // 🎨 URL mejorada
        const imageUrl = `https://api.discordarts.com/rankcard?avatar=${user.displayAvatarURL({ extension: "png" })}&username=${encodeURIComponent(user.username)}&level=${data.level}&currentxp=${data.xp}&nextlevelxp=${xpNeeded}&rank=${position}&barcolor=${color}`;

        await interaction.reply({
            embeds: [
                {
                    title: `📊 Rank de ${user.username}`,
                    description: `${badge ? badge + "\n" : ""}🏅 Posición: **#${position}**`,
                    image: { url: imageUrl },
                    color: parseInt(color, 16),
                    footer: {
                        text: "Sistema de niveles avanzado"
                    }
                }
            ]
        });
    }
};