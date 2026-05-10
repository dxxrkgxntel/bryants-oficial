const { SlashCommandBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');
const getConfig = require('../../utils/getConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apostar')
    .setDescription('Apuesta una cantidad de dinero')
    .addIntegerOption(o =>
      o.setName('cantidad')
        .setDescription('Cantidad a apostar')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('cantidad');
    const user = await getUser(interaction.guild.id, interaction.user.id);
    const config = await getConfig(interaction.guild.id);

    const now = Date.now();
    const cooldown = 30_000; // 30 segundos (ajustable luego)

    if (now - user.lastGamble < cooldown) {
      const remaining = Math.ceil((cooldown - (now - user.lastGamble)) / 1000);
      return interaction.reply({
        content: `⏳ Espera **${remaining}s** antes de volver a apostar.`,
        flags: 64
      });
    }

    if (amount > user.wallet) {
      return interaction.reply({
        content: '❌ No tienes suficiente dinero.',
        flags: 64
      });
    }

    if (amount < config.gambleMin || amount > config.gambleMax) {
      return interaction.reply({
        content: `❌ La apuesta debe estar entre **${config.gambleMin}** y **${config.gambleMax}**.`,
        flags: 64
      });
    }

    const win = Math.random() < 0.5;
    user.lastGamble = now;

    if (win) {
      user.wallet += amount;
      await user.save();
      return interaction.reply(`🎉 ¡Ganaste! Obtuviste **${amount.toLocaleString()} monedas**.`);
    } else {
      user.wallet -= amount;
      await user.save();
      return interaction.reply(`💥 Perdiste **${amount.toLocaleString()} monedas**.`);
    }
  }
};