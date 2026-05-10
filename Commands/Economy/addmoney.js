const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const getUser = require('../../utils/getUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('añadir-dinero')
    .setDescription('Añade dinero a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario al que se le añadirá dinero')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad a añadir')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');

    const userData = await getUser(interaction.guild.id, user.id);

    userData.wallet += amount;
    await userData.save();

    await interaction.reply({
      content: `✅ Se añadieron **${amount.toLocaleString()}** monedas a **${user.username}**`
    });
  }
};