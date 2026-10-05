const {
 SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
 MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, SeparatorSpacingSize
} = require("discord.js");
const getUser = require("../../Utils/getUser");
const applyBankBonus = require("../../Utils/applyBankBonus");
const updateDebt = require("../../Utils/updateDebt");
const getConfig = require("../../Utils/getConfig");

const BALANCE_BANNER = "https://i.imgur.com/IXKXRHL.png";
const WORK_BANNER = "https://i.imgur.com/X7jFa3S.png";
const DAILY_BANNER = "https://i.imgur.com/chBdO1Z.png";
const ECONOMY_BANNER = "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png";

function economyPanel(title, content, color = 0x8A2BE2, banner = ECONOMY_BANNER) {
 const panel = new ContainerBuilder().setAccentColor(color);
 panel.addMediaGalleryComponents(
  new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(banner))
 );
 panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`));
 panel.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
 panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
 return panel;
}

async function replyV2(interaction, title, content, color = 0x8A2BE2, ephemeral = false, banner = ECONOMY_BANNER) {
 return interaction.reply({
  components: [economyPanel(title, content, color, banner)],
  flags: ephemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2
 });
}

const jobs = [
"💻 Programador","🍕 Repartidor","🚕 Taxista","🎨 Diseñador","🎵 Productor musical","🛠️ Mecánico","🎮 Streamer","📦 Empaquetador","🏪 Cajero","☕ Barista","🎬 Editor de video","📸 Fotógrafo","🧹 Conserje","🍔 Cocinero","🚚 Transportista"
];

async function runBalance(interaction) {
 const target = interaction.user;
 const userData = await getUser(interaction.guild.id, target.id);
 const bonus = await applyBankBonus(userData);
 await userData.save();
 const addedDebt = await updateDebt(userData);
 const total = userData.wallet + userData.bank;
 const member = await interaction.guild.members.fetch(target.id).catch(() => null);
 const displayName = member?.displayName || target.username;
 let financialStatus = "🟢 Estable";
 if (userData.debt > 0) financialStatus = "🔴 Endeudado";
 if (userData.debt >= 100000) financialStatus = "⚠️ Deuda elevada";

 let text =
  `💵 **Wallet:** ${userData.wallet.toLocaleString()} monedas\n` +
  `🏦 **Banco:** ${userData.bank.toLocaleString()} monedas\n` +
  `📊 **Total:** ${total.toLocaleString()} monedas\n` +
  `📉 **Deuda:** ${userData.debt.toLocaleString()} monedas\n` +
  `🏛️ **Estado financiero:** ${financialStatus}`;

 if (addedDebt > 0) text += `\n\n📈 **Intereses acumulados:** +${addedDebt.toLocaleString()} monedas`;
 if (bonus > 0) text += `\n🏦 **Bonus Bancario:** +${bonus.toLocaleString()} monedas`;

 return replyV2(interaction, `💰 Balance de ${displayName}`, text, 0x8A2BE2, false, BALANCE_BANNER);
}
async function runDaily(interaction) {
 const user = await getUser(interaction.guild.id, interaction.user.id);
 const config = await getConfig(interaction.guild.id);
 const now = Date.now();
 const cooldown = config.dailyCooldown;

 if (now - user.lastDaily < cooldown) {
  const hours = Math.ceil((cooldown - (now - user.lastDaily)) / 3600000);
  return replyV2(interaction, "⏳ Daily ya reclamado",
   `Ya reclamaste tu recompensa diaria.\n\n🕒 Vuelve en **${hours} horas**.`, 0xFF0000, true, DAILY_BANNER);
 }

 const today = new Date().toDateString();
 const yesterday = new Date(Date.now() - 86400000).toDateString();
 if (user.lastDailyDate === yesterday) user.dailyStreak += 1;
 else if (user.lastDailyDate !== today) user.dailyStreak = 1;

 const streakBonus = user.dailyStreak * 100;
 const totalReward = config.dailyAmount + streakBonus;
 user.wallet += totalReward;
 user.lastDaily = now;
 user.lastDailyDate = today;
 await user.save();

 const text =
  `✨ Has reclamado tu recompensa diaria correctamente.\n\n` +
  `💰 **Recompensa base**\n> +${config.dailyAmount.toLocaleString()} monedas\n\n` +
  `🔥 **Bonus por streak**\n> +${streakBonus.toLocaleString()} monedas\n\n` +
  `📆 **Racha actual**\n> ${user.dailyStreak} días\n\n` +
  `🏦 **Total recibido**\n> +${totalReward.toLocaleString()} monedas\n\n` +
  `🔥 No pierdas tu streak diario.`;

 return replyV2(interaction, "🎁 Recompensa diaria reclamada", text, 0xFFD700, false, DAILY_BANNER);
}
async function runWork(interaction) {
 const user = await getUser(interaction.guild.id, interaction.user.id);
 const config = await getConfig(interaction.guild.id);
 const now = Date.now();
 const cooldown = config.workCooldown;

 if (now - user.lastWork < cooldown) {
  const minutes = Math.ceil((cooldown - (now - user.lastWork)) / 60000);
  return replyV2(interaction, "😴 Estás cansado",
   `Has trabajado demasiado por hoy.\n\n⏳ Podrás volver a trabajar en **${minutes} minutos**.`, 0xFF0000, true, WORK_BANNER);
 }

 const amount = Math.floor(Math.random() * (config.workMax - config.workMin + 1)) + config.workMin;
 const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
 user.wallet += amount;
 user.lastWork = now;
 await user.save();

 const text =
  `✨ ${interaction.user} trabajó como:\n> ${randomJob}\n\n` +
  `💰 **Ganancias obtenidas**\n> +${amount.toLocaleString()} monedas\n\n` +
  `🏦 **Balance actual**\n> ${user.wallet.toLocaleString()} monedas\n\n` +
  `📈 Continúa trabajando para aumentar tu fortuna dentro del servidor.`;

 return replyV2(interaction, "💼 Jornada completada", text, 0x8A2BE2, false, WORK_BANNER);
}
module.exports = {
 data: new SlashCommandBuilder()
  .setName("economy")
  .setDescription("Sistema de economía")
  .addSubcommand(s=>s.setName("balance").setDescription("Muestra tu balance"))
  .addSubcommand(s=>s.setName("daily").setDescription("Reclama tu recompensa diaria"))
  .addSubcommand(s=>s.setName("work").setDescription("Trabaja para ganar dinero")),
 async execute(interaction) {
  const sub=interaction.options.getSubcommand();
  if(sub==="balance") return runBalance(interaction);
  if(sub==="daily") return runDaily(interaction);
  if(sub==="work") return runWork(interaction);
 }
};
