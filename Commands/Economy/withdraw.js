const { SlashCommandBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');
const applyInterest = require('../../utils/applyInterest');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Retira dinero del banco')
    .addIntegerOption(o =>
      o.setName('cantidad')
        .setDescription('Cantidad a retirar')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('cantidad');
    const user = await getUser(interaction.guild.id, interaction.user.id);

    if (user.bank < amount) {
      return interaction.reply({ content: '❌ No tienes suficiente dinero en el banco.', flags: 64 });
    }

    await applyInterest(user, interaction.guild.id);

    user.bank -= amount;
    user.wallet += amount;
    await user.save();

    return interaction.reply(`💸 Has retirado **${amount.toLocaleString()} monedas** del banco.`);
  }
};