const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EconomyUser = require('../../Models/EconomyUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-dinero')
    .setDescription('Muestra el top de usuarios más ricos del servidor'),

  async execute(interaction) {
    const users = await EconomyUser.find({ guildId: interaction.guild.id })
      .sort({ bank: -1, wallet: -1 })
      .limit(10);

    if (!users.length) {
      return interaction.reply('❌ No hay datos de economía aún.');
    }

    const description = users.map((u, i) => {
      const total = u.wallet + u.bank;
      return `**${i + 1}.** <@${u.userId}> — 💰 ${total.toLocaleString()}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard de Economía')
      .setDescription(description)
      .setColor('#8A2BE2')
      .setFooter({ text: interaction.guild.name });

    await interaction.reply({ embeds: [embed] });
  }
};