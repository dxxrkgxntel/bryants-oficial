const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js");
const CountingConfig = require("../../Models/CountingConfig");
function isAdmin(interaction) { return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator); }
async function getConfig(guildId) {
  let config = await CountingConfig.findOne({ guildId });
  if (!config) config = await CountingConfig.create({ guildId });
  return config;
}
module.exports = {
  data: new SlashCommandBuilder().setName("counting").setDescription("Configura el canal de conteo del servidor.")
    .addSubcommand(sub => sub.setName("setup").setDescription("Configura el canal donde se contará.").addChannelOption(option => option.setName("canal").setDescription("Canal de texto para el conteo.").addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName("enable").setDescription("Activa el conteo configurado."))
    .addSubcommand(sub => sub.setName("disable").setDescription("Desactiva el conteo."))
    .addSubcommand(sub => sub.setName("info").setDescription("Muestra el estado y récord del conteo."))
    .addSubcommand(sub => sub.setName("reset").setDescription("Reinicia el conteo actual sin borrar el récord.")),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (["setup", "enable", "disable", "reset"].includes(sub) && !isAdmin(interaction)) return interaction.reply({ content: "⛔ Este subcomando es exclusivo para administradores.", ephemeral: true });
    const config = await getConfig(interaction.guild.id);
    if (sub === "setup") {
      const channel = interaction.options.getChannel("canal");
      config.channelId = channel.id; config.enabled = true; config.currentNumber = 0; config.currentStreak = 0; config.lastUserId = null;
      await config.save();
      return interaction.reply({ content: "✅ El conteo quedó configurado y activado en " + channel + ". El primer número es **1**.", ephemeral: true });
    }
    if (sub === "enable") {
      if (!config.channelId) return interaction.reply({ content: "⚠️ Primero configura un canal con /counting setup.", ephemeral: true });
      config.enabled = true; await config.save();
      return interaction.reply({ content: "✅ Conteo activado en <#" + config.channelId + ">. Número actual: **" + config.currentNumber + "**.", ephemeral: true });
    }
    if (sub === "disable") { config.enabled = false; await config.save(); return interaction.reply({ content: "⛔ Conteo desactivado.", ephemeral: true }); }
    if (sub === "reset") {
      config.currentNumber = 0; config.currentStreak = 0; config.lastUserId = null; await config.save();
      return interaction.reply({ content: "🔄 Conteo reiniciado. El próximo número es **1**. El récord histórico se conserva.", ephemeral: true });
    }
    const channel = config.channelId ? "<#" + config.channelId + ">" : "No configurado";
    const embed = new EmbedBuilder().setColor(0x8A2BE2).setTitle("🔢 Sistema de conteo").addFields(
      { name: "Estado", value: config.enabled ? "✅ Activado" : "⛔ Desactivado", inline: true },
      { name: "Canal", value: channel, inline: true },
      { name: "Número actual", value: Number(config.currentNumber || 0).toLocaleString(), inline: true },
      { name: "Récord del servidor", value: Number(config.highestNumber || 0).toLocaleString(), inline: true },
      { name: "Racha actual", value: Number(config.currentStreak || 0).toLocaleString(), inline: true }
    );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
