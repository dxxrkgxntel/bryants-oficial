const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const getConfig = require('../../utils/getConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('econconfig')
    .setDescription('Configura el sistema de economía')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o.setName('opcion')
        .setDescription('Qué deseas cambiar')
        .setRequired(true)
        .addChoices(
          { name: 'daily', value: 'dailyAmount' },
          { name: 'work-min', value: 'workMin' },
          { name: 'work-max', value: 'workMax' },
          { name: 'interes-banco', value: 'bankInterest' },
          { name: 'comision-banco', value: 'bankFee' },
          { name: 'gamble-min', value: 'gambleMin' },
          { name: 'gamble-max', value: 'gambleMax' }
        )
    )
    .addNumberOption(o =>
      o.setName('valor')
        .setDescription('Nuevo valor')
        .setRequired(true)
    ),

  async execute(interaction) {
    const option = interaction.options.getString('opcion');
    const value = interaction.options.getNumber('valor');

    const config = await getConfig(interaction.guild.id);
    config[option] = value;
    await config.save();

    interaction.reply(`⚙️ Configuración **${option}** actualizada a **${value}**`);
  }
};