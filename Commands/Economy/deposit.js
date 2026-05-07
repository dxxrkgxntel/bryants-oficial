const { SlashCommandBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');
const applyInterest = require('../../utils/applyInterest');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposita dinero en el banco')
    .addIntegerOption(o =>
      o.setName('cantidad')
        .setDescription('Cantidad a depositar')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('cantidad');
    const user = await getUser(interaction.guild.id, interaction.user.id);

    if (user.wallet < amount) {
      return interaction.reply({ content: '❌ No tienes suficiente dinero.', ephemeral: true });
    }

    // mover dinero
user.wallet -= amount;
user.bank += amount;

// cobrar comisión UNA vez
await applyInterest(user, interaction.guild.id);

// guardar UNA vez
await user.save();

    return interaction.reply(`🏦 Has depositado **${amount.toLocaleString()} monedas** en el banco.`);
  }
};