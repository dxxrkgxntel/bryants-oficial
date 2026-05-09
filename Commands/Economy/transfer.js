const { SlashCommandBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');
const applyInterest = require('../../utils/applyInterest');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Transfiere dinero a otro usuario')
    .addUserOption(o =>
      o.setName('usuario')
        .setDescription('Usuario destinatario')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('cantidad')
        .setDescription('Cantidad a transferir')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ No puedes transferirte a ti mismo.', flags: 64 });
    }

    const sender = await getUser(interaction.guild.id, interaction.user.id);
    const receiver = await getUser(interaction.guild.id, target.id);

    if (sender.wallet < amount) {
      return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: 64 });
    }

    await applyInterest(sender, interaction.guild.id);
    await applyInterest(receiver, interaction.guild.id);

    sender.wallet -= amount;
    receiver.wallet += amount;

    await sender.save();
    await receiver.save();

    return interaction.reply(`🔁 Transferiste **${amount.toLocaleString()} monedas** a **${target.username}**.`);
  }
};