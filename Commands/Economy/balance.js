const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Muestra tu balance o el de otro usuario')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario a consultar')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;

    const userData = await getUser(interaction.guild.id, target.id);

    const embed = new EmbedBuilder()
      .setColor('#8A2BE2')
      .setTitle(`💰 Balance de ${target.username}`)
      .addFields(
        { name: '💵 Wallet', value: `${userData.wallet.toLocaleString()} monedas`, inline: true },
        { name: '🏦 Banco', value: `${userData.bank.toLocaleString()} monedas`, inline: true },
        { name: '📊 Total', value: `${(userData.wallet + userData.bank).toLocaleString()} monedas` }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: interaction.guild.name });

    await interaction.reply({ embeds: [embed] });
  }
};