const { SlashCommandBuilder, EmbedBuilder, Client } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("Muestra el tiempo que el bot tiene activo."),

    async execute(interaction) {
        const client = interaction.client;
        const days = Math.floor(client.uptime / 86400000)
        const hours = Math.floor(client.uptime / 3600000) % 24
        const minutes = Math.floor(client.uptime / 60000) % 60
        const seconds = Math.floor(client.uptime / 1000) % 60

        const embed = new EmbedBuilder()
        .setTitle(`Time ${client.user.username}`)
        .setColor("#8A2BE2")
        .setTimestamp()
        .addFields(
            { name: "Tiempo activo:", value: ` \`${days}\` días, \`${hours}\` horas, \`${minutes}\` minutos y \`${seconds}\` segundos.`}
        )

        await interaction.reply({ embeds: [embed] })
    }
}