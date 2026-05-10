const { SlashCommandBuilder } = require('discord.js');
const ShopItem = require('../../Models/ShopItem');
const getUser = require('../../utils/getUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comprar-rol')
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
      return interaction.reply({ content: '❌ Ese rol no está en la tienda.', flags: 64 });
    }

    if (user.wallet < item.price) {
      return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: 64 });
    }

    if (interaction.member.roles.cache.has(role.id)) {
      return interaction.reply({ content: '⚠️ Ya tienes ese rol.', flags: 64 });
    }

    user.wallet -= item.price;
    await user.save();
    await interaction.member.roles.add(role);

    interaction.reply(`✅ Compraste el rol <@&${role.id}> por **${item.price.toLocaleString()}** monedas.`);
  }
};