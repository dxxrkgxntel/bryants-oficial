const {
 SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
 MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags, SeparatorSpacingSize,
 ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits
} = require("discord.js");
const getUser = require("../../Utils/getUser");
const applyBankBonus = require("../../Utils/applyBankBonus");
const updateDebt = require("../../Utils/updateDebt");
const getConfig = require("../../Utils/getConfig");
const GlobalBank = require("../../Models/GlobalBank");
const EconomyUser = require("../../Models/EconomyUser");
const RobCooldown = require("../../Models/RobCooldown");
const { runGlobalBank, runDonate, runLoan, runPayDebt, runDistribute } = require("./economyBankHandlers");

const BALANCE_BANNER = "https://i.imgur.com/IXKXRHL.png";
const WORK_BANNER = "https://i.imgur.com/X7jFa3S.png";
const DAILY_BANNER = "https://i.imgur.com/chBdO1Z.png";
const DEPOSIT_BANNER = "https://i.imgur.com/Mv7sPGH.png";
const WITHDRAW_BANNER = "https://i.imgur.com/emQw94y.png";
const TRANSFER_BANNER = "https://i.imgur.com/D0RzS0Q.png";
const ROB_BANNER = "https://i.imgur.com/qVeU3os.png";
const LEADERBOARD_BANNER = "https://i.imgur.com/rHeU2b6.png";
const ADDMONEY_BANNER = "https://i.imgur.com/BaeMyEP.png";
const REMOVEMONEY_BANNER = "https://i.imgur.com/LRdF0mj.png";
const CONFIG_BANNER = "https://i.imgur.com/zGMsUYR.png";
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

function transactionPanel(title, content, row = null, color = 0x8A2BE2, banner = ECONOMY_BANNER) {
 const panel = economyPanel(title, content, color, banner);
 if (row) {
  panel.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  panel.addActionRowComponents(row);
 }
 return panel;
}

async function runDeposit(interaction) {
 const amount = interaction.options.getInteger("cantidad");
 const user = await getUser(interaction.guild.id, interaction.user.id);

 if (user.wallet < amount) {
  return replyV2(interaction, "❌ Fondos insuficientes",
   "No tienes suficiente dinero en tu wallet para realizar este depósito.", 0xFF0000, true, DEPOSIT_BANNER);
 }

 const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("deposit_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("deposit_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
 );

 const panel = transactionPanel("🏦 Confirmar depósito",
  `⚠️ ¿Realmente deseas depositar **${amount.toLocaleString()} monedas** en el banco?\n\n💵 **Wallet actual:** ${user.wallet.toLocaleString()} monedas\n\n⏱️ Tienes **30 segundos** para responder.`, row, 0x8A2BE2, DEPOSIT_BANNER);

 const response = await interaction.reply({
  components: [panel],
  flags: MessageFlags.IsComponentsV2,
  withResponse: true
 });
 const msg = response.resource?.message || await interaction.fetchReply();
 const collector = msg.createMessageComponentCollector({ time: 30000 });

 collector.on("collect", async i => {
  if (i.user.id !== interaction.user.id) {
   return i.reply({ content: "❌ No puedes usar estos botones.", flags: MessageFlags.Ephemeral });
  }
  if (i.customId === "deposit_cancel") {
   collector.stop("cancelled");
   return i.update({ components: [transactionPanel("❌ Depósito cancelado", "La operación fue cancelada.", null, 0xFF0000, DEPOSIT_BANNER)] });
  }
  if (i.customId === "deposit_confirm") {
   user.wallet -= amount;
   user.bank += amount;
   await user.save();
   collector.stop("confirmed");
   return i.update({ components: [transactionPanel("🏦 Depósito realizado",
    `💸 Has depositado **${amount.toLocaleString()} monedas** en tu banco.\n\n💵 **Wallet:** ${user.wallet.toLocaleString()}\n🏦 **Banco:** ${user.bank.toLocaleString()}`, null, 0x00FF99, DEPOSIT_BANNER)] });
  }
 });

 collector.on("end", async (_, reason) => {
  if (reason === "time") {
   await msg.edit({ components: [transactionPanel("⌛ Tiempo agotado", "No confirmaste el depósito dentro de los 30 segundos.", null, 0xFF0000, DEPOSIT_BANNER)] }).catch(() => {});
  }
 });
}

async function runWithdraw(interaction) {
 const amount = interaction.options.getInteger("cantidad");
 const user = await getUser(interaction.guild.id, interaction.user.id);

 if (user.bank < amount) {
  return replyV2(interaction, "❌ Fondos insuficientes",
   "No tienes suficiente dinero en el banco para realizar este retiro.", 0xFF0000, true, WITHDRAW_BANNER);
 }

 const fee = Math.floor(amount * 0.05);
 const finalAmount = amount - fee;
 const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("withdraw_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("withdraw_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
 );

 const panel = transactionPanel("🏦 Confirmar retiro",
  `⚠️ ¿Realmente deseas retirar **${amount.toLocaleString()} monedas**?\n\n💸 **Comisión bancaria:** ${fee.toLocaleString()} monedas\n✅ **Recibirás:** ${finalAmount.toLocaleString()} monedas\n\n⏱️ Tienes **30 segundos** para responder.`, row, 0x8A2BE2, WITHDRAW_BANNER);

 const response = await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, withResponse: true });
 const msg = response.resource?.message || await interaction.fetchReply();
 const collector = msg.createMessageComponentCollector({ time: 30000 });

 collector.on("collect", async i => {
  if (i.user.id !== interaction.user.id) {
   return i.reply({ content: "❌ No puedes usar estos botones.", flags: MessageFlags.Ephemeral });
  }
  if (i.customId === "withdraw_cancel") {
   collector.stop("cancelled");
   return i.update({ components: [transactionPanel("❌ Retiro cancelado", "La operación fue cancelada.", null, 0xFF0000, WITHDRAW_BANNER)] });
  }
  if (i.customId === "withdraw_confirm") {
   user.bank -= amount;
   user.wallet += finalAmount;
   let globalBank = await GlobalBank.findOne({ guildId: interaction.guild.id });
   if (!globalBank) globalBank = new GlobalBank({ guildId: interaction.guild.id });
   globalBank.balance += fee;
   globalBank.totalCollected += fee;
   await user.save();
   await globalBank.save();
   collector.stop("confirmed");
   return i.update({ components: [transactionPanel("💸 Retiro realizado",
    `🏦 Has retirado **${amount.toLocaleString()} monedas**.\n\n💸 **Comisión:** ${fee.toLocaleString()} monedas\n✅ **Recibido:** ${finalAmount.toLocaleString()} monedas\n\n💵 **Wallet:** ${user.wallet.toLocaleString()}\n🏦 **Banco:** ${user.bank.toLocaleString()}`, null, 0x00FF99, WITHDRAW_BANNER)] });
  }
 });

 collector.on("end", async (_, reason) => {
  if (reason === "time") {
   await msg.edit({ components: [transactionPanel("⌛ Tiempo agotado", "No confirmaste el retiro dentro de los 30 segundos.", null, 0xFF0000, WITHDRAW_BANNER)] }).catch(() => {});
  }
 });
}

async function runTransfer(interaction) {
 const target = interaction.options.getUser("usuario");
 const amount = interaction.options.getInteger("cantidad");

 if (target.id === interaction.user.id) {
  return replyV2(interaction, "❌ Transferencia inválida", "No puedes transferirte dinero a ti mismo.", 0xFF0000, true, TRANSFER_BANNER);
 }

 const sender = await getUser(interaction.guild.id, interaction.user.id);
 const receiver = await getUser(interaction.guild.id, target.id);
 const totalMoney = sender.wallet + sender.bank;

 if (totalMoney < amount) {
  return replyV2(interaction, "❌ Fondos insuficientes",
   "No tienes suficiente dinero entre wallet y banco para realizar esta transferencia.", 0xFF0000, true, TRANSFER_BANNER);
 }

 const tax = Math.floor(amount * 0.05);
 const finalAmount = amount - tax;
 const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("transfer_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("transfer_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
 );

 const panel = transactionPanel("💸 Confirmar transferencia",
  `⚠️ ¿Realmente deseas transferir **${amount.toLocaleString()} monedas** a ${target}?\n\n🏦 **Comisión bancaria:** ${tax.toLocaleString()} monedas\n📥 **El usuario recibirá:** ${finalAmount.toLocaleString()} monedas\n\n💵 **Wallet:** ${sender.wallet.toLocaleString()}\n🏦 **Banco:** ${sender.bank.toLocaleString()}\n\n⏱️ Tienes **30 segundos** para responder.`, row, 0x8A2BE2, TRANSFER_BANNER);

 const response = await interaction.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, withResponse: true });
 const msg = response.resource?.message || await interaction.fetchReply();
 const collector = msg.createMessageComponentCollector({ time: 30000 });

 collector.on("collect", async i => {
  if (i.user.id !== interaction.user.id) {
   return i.reply({ content: "❌ No puedes usar estos botones.", flags: MessageFlags.Ephemeral });
  }
  if (i.customId === "transfer_cancel") {
   await i.deferUpdate();
   collector.stop("cancelled");
   return interaction.editReply({ components: [transactionPanel("❌ Transferencia cancelada", "La operación fue cancelada.", null, 0xFF0000, TRANSFER_BANNER)] });
  }
  if (i.customId === "transfer_confirm") {
   await i.deferUpdate();

   // Volvemos a consultar los saldos al confirmar para evitar usar datos obsoletos.
   const freshSender = await getUser(interaction.guild.id, interaction.user.id);
   const freshReceiver = await getUser(interaction.guild.id, target.id);
   const freshTotal = freshSender.wallet + freshSender.bank;

   if (freshTotal < amount) {
    collector.stop("insufficient");
    return interaction.editReply({
     components: [transactionPanel("❌ Fondos insuficientes", "Tu saldo cambió y ya no tienes fondos suficientes para completar la transferencia.", null, 0xFF0000, TRANSFER_BANNER)]
    });
   }

   if (freshSender.wallet >= amount) freshSender.wallet -= amount;
   else {
    const remaining = amount - freshSender.wallet;
    freshSender.wallet = 0;
    freshSender.bank -= remaining;
   }
   freshReceiver.wallet += finalAmount;
   let globalBank = await GlobalBank.findOne({ guildId: interaction.guild.id });
   if (!globalBank) globalBank = new GlobalBank({ guildId: interaction.guild.id, balance: 0 });
   globalBank.balance += tax;
   if (typeof globalBank.totalCollected === "number") globalBank.totalCollected += tax;
   await freshSender.save();
   await freshReceiver.save();
   await globalBank.save();
   collector.stop("confirmed");
   return interaction.editReply({ components: [transactionPanel("🔁 Transferencia realizada",
    `💸 Has transferido **${amount.toLocaleString()} monedas** a ${target}.\n\n🏦 **Comisión:** ${tax.toLocaleString()} monedas\n📥 **Recibido por el usuario:** ${finalAmount.toLocaleString()} monedas\n\n💵 **Wallet:** ${freshSender.wallet.toLocaleString()}\n🏦 **Banco:** ${freshSender.bank.toLocaleString()}`, null, 0x00FF99, TRANSFER_BANNER)] });
  }
 });

 collector.on("end", async (_, reason) => {
  if (reason === "time") {
   await msg.edit({ components: [transactionPanel("⌛ Tiempo agotado", "No confirmaste la transferencia dentro de los 30 segundos.", null, 0xFF0000, TRANSFER_BANNER)] }).catch(() => {});
  }
 });
}


async function runRob(interaction) {
 const target = interaction.options.getUser("usuario");
 if (target.bot) return replyV2(interaction, "❌ Robo inválido", "No puedes robar bots.", 0xFF0000, true, ROB_BANNER);
 if (target.id === interaction.user.id) return replyV2(interaction, "❌ Robo inválido", "No puedes robarte a ti mismo.", 0xFF0000, true, ROB_BANNER);

 const cooldown = await RobCooldown.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
 if (cooldown && cooldown.expiresAt > new Date()) {
  return replyV2(interaction, "⏳ Robo en cooldown",
   `Ya robaste recientemente.\n\nVuelve a intentarlo <t:${Math.floor(cooldown.expiresAt.getTime()/1000)}:R>.`, 0xFF0000, true, ROB_BANNER);
 }

 let robberData = await EconomyUser.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
 let targetData = await EconomyUser.findOne({ guildId: interaction.guild.id, userId: target.id });
 if (!robberData) robberData = await EconomyUser.create({ guildId: interaction.guild.id, userId: interaction.user.id, wallet: 0, bank: 0 });
 if (!targetData) targetData = await EconomyUser.create({ guildId: interaction.guild.id, userId: target.id, wallet: 0, bank: 0 });
 robberData.wallet = Number(robberData.wallet) || 0;
 targetData.wallet = Number(targetData.wallet) || 0;

 if (targetData.wallet < 5000) return replyV2(interaction, "❌ Objetivo no disponible", "Ese usuario tiene muy poco efectivo para robar.", 0xFF0000, true, ROB_BANNER);

 const success = Math.random() < 0.55;
 if (!success) {
  let fine = Math.floor(robberData.wallet * (Math.random() * 0.04 + 0.01));
  if (fine < 250) fine = 250;
  if (fine > robberData.wallet) fine = robberData.wallet;
  robberData.wallet = Math.max(0, robberData.wallet - fine);
  await robberData.save();
  await RobCooldown.findOneAndUpdate(
   { guildId: interaction.guild.id, userId: interaction.user.id },
   { expiresAt: new Date(Date.now() + 30 * 60 * 1000) }, { upsert: true }
  );
  return replyV2(interaction, "🚔 Robo fallido",
   `Intentaste robar a ${target}, pero te atraparon.\n\n💸 **Multa:** ${fine.toLocaleString()} coins`, 0xFF0000, false, ROB_BANNER);
 }

 let amount = Math.floor(targetData.wallet * (Math.random() * 0.09 + 0.03));
 amount = Math.max(250, Math.min(50000, amount, targetData.wallet));
 amount = Number(amount) || 0;
 if (amount <= 0) return replyV2(interaction, "❌ Robo fallido", "No se pudo completar el robo.", 0xFF0000, true, ROB_BANNER);

 targetData.wallet = Math.max(0, targetData.wallet - amount);
 robberData.wallet += amount;
 await targetData.save();
 await robberData.save();
 await RobCooldown.findOneAndUpdate(
  { guildId: interaction.guild.id, userId: interaction.user.id },
  { expiresAt: new Date(Date.now() + 30 * 60 * 1000) }, { upsert: true }
 );
 return replyV2(interaction, "🦹 Robo exitoso",
  `Robaste exitosamente a ${target}.\n\n💰 **Cantidad robada:** ${amount.toLocaleString()} coins\n👛 **Dinero restante de la víctima:** ${targetData.wallet.toLocaleString()} coins`, 0x8A2BE2, false, ROB_BANNER);
}

async function runLeaderboard(interaction) {
 const pageSize = 5;
 let currentPage = 0;
 const leaderboard = await EconomyUser.aggregate([
  { $match: { guildId: interaction.guild.id } },
  { $addFields: { totalMoney: { $add: ["$wallet", "$bank"] } } },
  { $sort: { totalMoney: -1 } }
 ]);
 if (!leaderboard.length) return replyV2(interaction, "💰 Ranking económico", "❌ No hay datos de economía aún.", 0xFF0000, true, LEADERBOARD_BANNER);

 const totalPages = Math.ceil(leaderboard.length / pageSize);
 const totalMoney = leaderboard.reduce((acc,u)=>acc + u.wallet + u.bank, 0);
 const userPosition = leaderboard.findIndex(u=>u.userId===interaction.user.id)+1;

 const makePanel = (page, disabled=false) => {
  const start=page*pageSize;
  const users=leaderboard.slice(start,start+pageSize);
  const description=users.map((u,i)=>{
   const position=start+i+1, total=u.wallet+u.bank;
   const percent=totalMoney ? ((total/totalMoney)*100).toFixed(1) : "0.0";
   const medal=position===1?"🥇":position===2?"🥈":position===3?"🥉":"💠";
   return `${medal} **#${position}** <@${u.userId}>\n> 👛 Wallet: **${u.wallet.toLocaleString()}**\n> 🏦 Banco: **${u.bank.toLocaleString()}**\n> 💎 Total: **${total.toLocaleString()}**\n> 📈 Riqueza global: **${percent}%**`;
  }).join("\n\n");
  const row=new ActionRowBuilder().addComponents(
   new ButtonBuilder().setCustomId("leaderboard_previous").setEmoji("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(disabled||page===0),
   new ButtonBuilder().setCustomId("leaderboard_next").setEmoji("➡️").setStyle(ButtonStyle.Secondary).setDisabled(disabled||page===totalPages-1)
  );
  return transactionPanel("🏦 Elite Financiera",
   `### 💰 Top usuarios más ricos\n\n${description}\n\n📍 **Tu posición:** #${userPosition || "Sin ranking"}\n📄 **Página:** ${page+1}/${totalPages}`, row);
 };

 const response=await interaction.reply({components:[makePanel(currentPage)],flags:MessageFlags.IsComponentsV2,withResponse:true});
 const message=response.resource?.message || await interaction.fetchReply();
 const collector=message.createMessageComponentCollector({time:120000});

 collector.on("collect",async btn=>{
  if(btn.user.id!==interaction.user.id) return btn.reply({content:"❌ No puedes usar estos botones.",flags:MessageFlags.Ephemeral});
  await btn.deferUpdate();
  if(btn.customId==="leaderboard_previous" && currentPage>0) currentPage--;
  else if(btn.customId==="leaderboard_next" && currentPage<totalPages-1) currentPage++;
  await interaction.editReply({components:[makePanel(currentPage)]});
 });
 collector.on("end",async()=>interaction.editReply({components:[makePanel(currentPage,true)]}).catch(()=>{}));
}


async function runAddMoney(interaction) {
 if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
  return replyV2(interaction, "❌ Sin permisos", "Necesitas permisos de **Administrador** para utilizar este subcomando.", 0xFF0000, true, ADDMONEY_BANNER);

 const target=interaction.options.getUser("usuario");
 const amount=interaction.options.getInteger("cantidad");
 const row=new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("addmoney_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("addmoney_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
 );
 const initial=await getUser(interaction.guild.id,target.id);
 const response=await interaction.reply({
  components:[transactionPanel("💰 Confirmar añadir dinero",
   `⚠️ ¿Deseas añadir **${amount.toLocaleString()} monedas** a ${target}?\n\n💵 **Wallet actual:** ${initial.wallet.toLocaleString()} monedas\n\n⏱️ Tienes **30 segundos** para responder.`,
   row,0x8A2BE2,ADDMONEY_BANNER)],
  flags:MessageFlags.IsComponentsV2,withResponse:true
 });
 const msg=response.resource?.message || await interaction.fetchReply();
 const collector=msg.createMessageComponentCollector({time:30000});
 collector.on("collect",async i=>{
  if(i.user.id!==interaction.user.id) return i.reply({content:"❌ No puedes usar estos botones.",flags:MessageFlags.Ephemeral});
  await i.deferUpdate();
  if(i.customId==="addmoney_cancel"){
   collector.stop("cancelled");
   return interaction.editReply({components:[transactionPanel("❌ Operación cancelada","No se realizó ningún cambio.",null,0xFF0000,ADDMONEY_BANNER)]});
  }
  if(i.customId==="addmoney_confirm"){
   const fresh=await getUser(interaction.guild.id,target.id);
   fresh.wallet+=amount;
   await fresh.save();
   collector.stop("confirmed");
   return interaction.editReply({components:[transactionPanel("💰 Dinero añadido",
    `✅ Se añadieron **${amount.toLocaleString()} monedas** a ${target}.\n\n💵 **Wallet actual:** ${fresh.wallet.toLocaleString()} monedas\n👮 **Acción realizada por:** ${interaction.user}`,
    null,0x00FF99,ADDMONEY_BANNER)]});
  }
 });
 collector.on("end",async(_,reason)=>{
  if(reason==="time") await interaction.editReply({components:[transactionPanel("⌛ Tiempo agotado","No confirmaste la operación dentro de los 30 segundos.",null,0xFF0000,ADDMONEY_BANNER)]}).catch(()=>{});
 });
}

async function runRemoveMoney(interaction) {
 if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
  return replyV2(interaction, "❌ Sin permisos", "Necesitas permisos de **Administrador** para utilizar este subcomando.", 0xFF0000, true, REMOVEMONEY_BANNER);

 const target=interaction.options.getUser("usuario");
 const amount=interaction.options.getInteger("cantidad");
 const initial=await getUser(interaction.guild.id,target.id);
 if(initial.wallet<amount) return replyV2(interaction,"❌ Fondos insuficientes",
  "El usuario no tiene suficiente dinero en su wallet.",0xFF0000,true,REMOVEMONEY_BANNER);

 const row=new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("removemoney_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId("removemoney_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary)
 );
 const response=await interaction.reply({
  components:[transactionPanel("💸 Confirmar quitar dinero",
   `⚠️ ¿Deseas quitar **${amount.toLocaleString()} monedas** a ${target}?\n\n💵 **Wallet actual:** ${initial.wallet.toLocaleString()} monedas\n\n⏱️ Tienes **30 segundos** para responder.`,
   row,0x8A2BE2,REMOVEMONEY_BANNER)],
  flags:MessageFlags.IsComponentsV2,withResponse:true
 });
 const msg=response.resource?.message || await interaction.fetchReply();
 const collector=msg.createMessageComponentCollector({time:30000});
 collector.on("collect",async i=>{
  if(i.user.id!==interaction.user.id) return i.reply({content:"❌ No puedes usar estos botones.",flags:MessageFlags.Ephemeral});
  await i.deferUpdate();
  if(i.customId==="removemoney_cancel"){
   collector.stop("cancelled");
   return interaction.editReply({components:[transactionPanel("❌ Operación cancelada","No se realizó ningún cambio.",null,0xFF0000,REMOVEMONEY_BANNER)]});
  }
  if(i.customId==="removemoney_confirm"){
   const fresh=await getUser(interaction.guild.id,target.id);
   if(fresh.wallet<amount){
    collector.stop("insufficient");
    return interaction.editReply({components:[transactionPanel("❌ Fondos insuficientes","El saldo del usuario cambió y ya no tiene suficiente dinero.",null,0xFF0000,REMOVEMONEY_BANNER)]});
   }
   fresh.wallet-=amount;
   await fresh.save();
   collector.stop("confirmed");
   return interaction.editReply({components:[transactionPanel("💸 Dinero removido",
    `❌ Se quitaron **${amount.toLocaleString()} monedas** a ${target}.\n\n💵 **Wallet actual:** ${fresh.wallet.toLocaleString()} monedas\n👮 **Acción realizada por:** ${interaction.user}`,
    null,0xFF0000,REMOVEMONEY_BANNER)]});
  }
 });
 collector.on("end",async(_,reason)=>{
  if(reason==="time") await interaction.editReply({components:[transactionPanel("⌛ Tiempo agotado","No confirmaste la operación dentro de los 30 segundos.",null,0xFF0000,REMOVEMONEY_BANNER)]}).catch(()=>{});
 });
}

async function runConfig(interaction) {
 if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
  return replyV2(interaction, "❌ Sin permisos", "Necesitas permisos de **Administrador** para utilizar este subcomando.", 0xFF0000, true, CONFIG_BANNER);
 const option=interaction.options.getString("opcion");
 const value=interaction.options.getNumber("valor");
 const config=await getConfig(interaction.guild.id);
 config[option]=value;
 await config.save();
 return replyV2(interaction,"⚙️ Configuración actualizada",
  `**Parámetro:** ${option}\n**Nuevo valor:** ${value}\n\n✅ La configuración de economía fue guardada correctamente.`,
  0x8A2BE2,false,CONFIG_BANNER);
}

module.exports = {
 data: new SlashCommandBuilder()
  .setName("economy")
  .setDescription("Sistema de economía")
  .addSubcommand(s=>s.setName("balance").setDescription("Muestra tu balance"))
  .addSubcommand(s=>s.setName("daily").setDescription("Reclama tu recompensa diaria"))
  .addSubcommand(s=>s.setName("work").setDescription("Trabaja para ganar dinero"))
  .addSubcommand(s=>s.setName("deposit").setDescription("Deposita dinero en el banco")
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad a depositar").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("withdraw").setDescription("Retira dinero del banco")
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad a retirar").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("transfer").setDescription("Transfiere dinero a otro usuario")
   .addUserOption(o=>o.setName("usuario").setDescription("Usuario destinatario").setRequired(true))
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad a transferir").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("rob").setDescription("Intenta robarle coins a otro usuario")
   .addUserOption(o=>o.setName("usuario").setDescription("Usuario a robar").setRequired(true)))
  .addSubcommand(s=>s.setName("leaderboard").setDescription("Muestra el top de usuarios más ricos"))
  .addSubcommand(s=>s.setName("addmoney").setDescription("Añade dinero a un usuario (Administrador)")
   .addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true))
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("removemoney").setDescription("Quita dinero a un usuario (Administrador)")
   .addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true))
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("bank").setDescription("Muestra el banco global del servidor"))
  .addSubcommand(s=>s.setName("donate").setDescription("Dona dinero al banco global")
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad a donar").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("loan").setDescription("Solicita un préstamo al banco")
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad a solicitar").setRequired(true).setMinValue(1000)))
  .addSubcommand(s=>s.setName("paydebt").setDescription("Paga tu deuda con el banco")
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad a pagar").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("distribute").setDescription("Entrega dinero desde el banco global (Administrador)")
   .addUserOption(o=>o.setName("usuario").setDescription("Usuario beneficiado").setRequired(true))
   .addIntegerOption(o=>o.setName("cantidad").setDescription("Cantidad a entregar").setRequired(true).setMinValue(1)))
  .addSubcommand(s=>s.setName("config").setDescription("Configura el sistema de economía (Administrador)")
   .addStringOption(o=>o.setName("opcion").setDescription("Qué deseas cambiar").setRequired(true).addChoices(
    {name:"daily",value:"dailyAmount"},{name:"work-min",value:"workMin"},{name:"work-max",value:"workMax"},
    {name:"interes-banco",value:"bankInterest"},{name:"comision-banco",value:"bankFee"},
    {name:"gamble-min",value:"gambleMin"},{name:"gamble-max",value:"gambleMax"}))
   .addNumberOption(o=>o.setName("valor").setDescription("Nuevo valor").setRequired(true))),
 async execute(interaction) {
  const sub=interaction.options.getSubcommand();
  if(sub==="balance") return runBalance(interaction);
  if(sub==="daily") return runDaily(interaction);
  if(sub==="work") return runWork(interaction);
  if(sub==="deposit") return runDeposit(interaction);
  if(sub==="withdraw") return runWithdraw(interaction);
  if(sub==="transfer") return runTransfer(interaction);
  if(sub==="rob") return runRob(interaction);
  if(sub==="leaderboard") return runLeaderboard(interaction);
  if(sub==="bank") return runGlobalBank(interaction);
  if(sub==="donate") return runDonate(interaction);
  if(sub==="loan") return runLoan(interaction);
  if(sub==="paydebt") return runPayDebt(interaction);
  if(sub==="distribute") return runDistribute(interaction);
  if(sub==="addmoney") return runAddMoney(interaction);
  if(sub==="removemoney") return runRemoveMoney(interaction);
  if(sub==="config") return runConfig(interaction);
 }
};
