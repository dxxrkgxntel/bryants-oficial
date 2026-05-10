const { SlashCommandBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');
const getConfig = require('../../utils/getConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajar')
    .setDescription('Trabaja para ganar dinero'),

  async execute(interaction) {
    const user = await getUser(interaction.guild.id, interaction.user.id);
    const config = await getConfig(interaction.guild.id);

    const now = Date.now();
    const cooldown = config.workCooldown;

    if (now - user.lastWork < cooldown) {
      const remaining = cooldown - (now - user.lastWork);
      const minutes = Math.ceil(remaining / 60000);

      return interaction.reply({
        content: `⏳ Estás cansado. Vuelve a trabajar en **${minutes} minutos**.`,
        flags: 64
      });
    }

    const amount =
      Math.floor(Math.random() * (config.workMax - config.workMin + 1)) +
      config.workMin;

    user.wallet += amount;
    user.lastWork = now;
    await user.save();

    await interaction.reply({
      content: `🛠️ Trabajaste duro y ganaste **${amount.toLocaleString()} monedas**.`
    });
  }
};