const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const getUser = require('../../utils/getUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removemoney')
    .setDescription('Quita dinero a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario al que se le quitará dinero')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad a quitar')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');

    const userData = await getUser(interaction.guild.id, user.id);

    if (userData.wallet < amount) {
      return interaction.reply({
        content: '❌ El usuario no tiene suficiente dinero.',
        flags: 64
      });
    }

    userData.wallet -= amount;
    await userData.save();

    await interaction.reply({
      content: `✅ Se quitaron **${amount.toLocaleString()}** monedas a **${user.username}**`
    });
  }
};