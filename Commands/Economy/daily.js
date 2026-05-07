const { SlashCommandBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');
const getConfig = require('../../utils/getConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Reclama tu recompensa diaria'),

  async execute(interaction) {
    const user = await getUser(interaction.guild.id, interaction.user.id);
    const config = await getConfig(interaction.guild.id);

    const now = Date.now();
    const cooldown = config.dailyCooldown;

    if (now - user.lastDaily < cooldown) {
      const remaining = cooldown - (now - user.lastDaily);
      const hours = Math.ceil(remaining / 3600000);

      return interaction.reply({
        content: `⏳ Ya reclamaste tu daily. Vuelve en **${hours}h**.`,
        ephemeral: true
      });
    }

    user.wallet += config.dailyAmount;
    user.lastDaily = now;
    await user.save();

    await interaction.reply({
      content: `🎁 Has recibido **${config.dailyAmount.toLocaleString()} monedas** de tu daily.`
    });
  }
};