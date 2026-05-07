const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ShopItem = require('../../Models/ShopItem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop-add')
    .setDescription('Agrega un rol a la tienda')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addRoleOption(o =>
      o
        .setName('rol')
        .setDescription('Rol que se añadirá a la tienda') // ✔️ FIX
        .setRequired(true)
    )

    .addIntegerOption(o =>
      o
        .setName('precio')
        .setDescription('Precio del rol') // ✔️ FIX
        .setRequired(true)
    ),

  async execute(interaction) {
    const role = interaction.options.getRole('rol');
    const price = interaction.options.getInteger('precio');

    await ShopItem.create({
      guildId: interaction.guild.id,
      roleId: role.id,
      price
    });

    await interaction.reply(
      `🛒 Rol <@&${role.id}> agregado por **${price.toLocaleString()}** monedas.`
    );
  }
};