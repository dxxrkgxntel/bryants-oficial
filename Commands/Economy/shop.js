const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ShopItem = require('../../Models/ShopItem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tienda-roles')
    .setDescription('Muestra la tienda de roles'),

  async execute(interaction) {
    const items = await ShopItem.find({ guildId: interaction.guild.id });

    if (!items.length) {
      return interaction.reply('🛒 La tienda está vacía.');
    }

    const desc = items.map((i, index) =>
      `**${index + 1}.** <@&${i.roleId}> — 💰 ${i.price.toLocaleString()}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🛒 Tienda de Roles')
      .setDescription(desc)
      .setColor('#8A2BE2');

    interaction.reply({ embeds: [embed] });
  }
};