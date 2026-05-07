const { SlashCommandBuilder } = require('discord.js');
const ShopItem = require('../../Models/ShopItem');
const getUser = require('../../utils/getUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Compra un rol de la tienda')
    .addRoleOption(o =>
      o.setName('rol')
        .setDescription('Rol que deseas comprar')
        .setRequired(true)
    ),

  async execute(interaction) {
    const role = interaction.options.getRole('rol');
    const user = await getUser(interaction.guild.id, interaction.user.id);

    const item = await ShopItem.findOne({
      guildId: interaction.guild.id,
      roleId: role.id
    });

    if (!item) {
      return interaction.reply({ content: '❌ Ese rol no está en la tienda.', ephemeral: true });
    }

    if (user.wallet < item.price) {
      return interaction.reply({ content: '❌ No tienes suficiente dinero.', ephemeral: true });
    }

    if (interaction.member.roles.cache.has(role.id)) {
      return interaction.reply({ content: '⚠️ Ya tienes ese rol.', ephemeral: true });
    }

    user.wallet -= item.price;
    await user.save();
    await interaction.member.roles.add(role);

    interaction.reply(`✅ Compraste el rol <@&${role.id}> por **${item.price.toLocaleString()}** monedas.`);
  }
};