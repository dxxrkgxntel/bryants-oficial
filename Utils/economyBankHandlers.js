const {
 ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder,
 MediaGalleryItemBuilder, MessageFlags, SeparatorSpacingSize,
 ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits
} = require("discord.js");
const getUser = require("../../Utils/getUser");
const updateDebt = require("../../Utils/updateDebt");
const GlobalBank = require("../../Models/GlobalBank");
const BankDonorRole = require("../../Models/BankDonorRoles");

const BANK_BANNER = "https://i.imgur.com/jzy7Lhn.png";
const DONATE_BANNER = "https://i.imgur.com/BI516It.png";
const LOAN_BANNER = "https://i.imgur.com/b9oRpan.png";
const PAYDEBT_BANNER = "https://i.imgur.com/yQMRSip.png";
const DISTRIBUTE_BANNER = "https://i.imgur.com/51zouSf.png";
const BANNER = BANK_BANNER;

function panel(title, content, row=null, color=0x8A2BE2, banner=BANNER) {
 const p=new ContainerBuilder().setAccentColor(color);
 p.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(banner)));
 p.addTextDisplayComponents(new TextDisplayBuilder().setContent("## "+title));
 p.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
 p.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
 if(row){p.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));p.addActionRowComponents(row);}
 return p;
}
function reply(interaction,title,content,color=0x8A2BE2,ephemeral=false,banner=BANNER){
 return interaction.reply({components:[panel(title,content,null,color,banner)],flags:ephemeral?MessageFlags.IsComponentsV2|MessageFlags.Ephemeral:MessageFlags.IsComponentsV2});
}
async function bank(guildId){
 let b=await GlobalBank.findOne({guildId});
 if(!b){b=new GlobalBank({guildId,balance:0});await b.save();}
 return b;
}
async function runGlobalBank(interaction){
 const b=await bank(interaction.guild.id);
 return reply(interaction,"🏦 Banco Global del Servidor","🏦 **Balance actual**\n> "+Number(b.balance||0).toLocaleString()+" monedas\n\n📈 **Total recolectado**\n> "+Number(b.totalCollected||0).toLocaleString()+" monedas\n\n📉 **Total distribuido**\n> "+Number(b.totalDistributed||0).toLocaleString()+" monedas\n\n🌍 **Servidor:** "+interaction.guild.name+"\n👥 **Miembros:** "+interaction.guild.memberCount,0x8A2BE2,false,BANK_BANNER);
}
async function runDonate(interaction){
 const amount=interaction.options.getInteger("cantidad"),u=await getUser(interaction.guild.id,interaction.user.id);
 if(Number(u.wallet||0)+Number(u.bank||0)<amount)return reply(interaction,"❌ Fondos insuficientes","No tienes suficiente dinero para donar esa cantidad.",0xFF0000,true,DONATE_BANNER);
 if(u.wallet>=amount)u.wallet-=amount;else{const r=amount-u.wallet;u.wallet=0;u.bank-=r;}
 const b=await bank(interaction.guild.id);b.balance=Number(b.balance||0)+amount;u.bankDonated=Number(u.bankDonated||0)+amount;
 await u.save();await b.save();
 const unlocked=[],roles=await BankDonorRole.find({guildId:interaction.guild.id});
 for(const d of roles){if(u.bankDonated<d.requiredAmount)continue;const role=interaction.guild.roles.cache.get(d.roleId);if(role&&!interaction.member.roles.cache.has(role.id)){await interaction.member.roles.add(role).catch(()=>null);if(interaction.member.roles.cache.has(role.id))unlocked.push(role.toString());}}
 let t="💸 Has donado **"+amount.toLocaleString()+" monedas** al banco global.\n\n🏦 **Banco global actual:** "+b.balance.toLocaleString()+" monedas\n📈 **Total donado:** "+u.bankDonated.toLocaleString()+" monedas";
 if(unlocked.length)t+="\n\n🎉 **Roles desbloqueados**\n"+unlocked.join("\n");
 return reply(interaction,"🏦 Donación realizada",t,0x00FF99,false,DONATE_BANNER);
}
async function runLoan(interaction){
 const amount=interaction.options.getInteger("cantidad"),u=await getUser(interaction.guild.id,interaction.user.id);await updateDebt(u);
 const b=await bank(interaction.guild.id),max=500000;
 if(amount>max)return reply(interaction,"❌ Préstamo no disponible","El préstamo máximo es de **"+max.toLocaleString()+" monedas**.",0xFF0000,true,LOAN_BANNER);
 if(u.debt>0||u.loanTaken)return reply(interaction,"❌ Deuda activa","Ya tienes una deuda activa de **"+Number(u.debt||0).toLocaleString()+" monedas**.\n\nDebes pagarla antes de solicitar otro préstamo.",0xFF0000,true,LOAN_BANNER);
 if(b.balance<amount)return reply(interaction,"❌ Fondos insuficientes","El banco global no tiene suficientes fondos actualmente.",0xFF0000,true,LOAN_BANNER);
 const interest=Math.floor(amount*0.20),debt=amount+interest;
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("loan_accept").setLabel("Aceptar").setEmoji("✅").setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId("loan_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary));
 const res=await interaction.reply({components:[panel("🏦 Solicitud de préstamo","💰 **Cantidad solicitada:** "+amount.toLocaleString()+" monedas\n📈 **Interés inicial:** "+interest.toLocaleString()+" monedas (20%)\n📉 **Deuda inicial:** "+debt.toLocaleString()+" monedas\n\n⚠️ Mientras más tardes en pagar, más intereses se acumularán.\n\n¿Deseas continuar?",row,0x8A2BE2,LOAN_BANNER)],flags:MessageFlags.IsComponentsV2,withResponse:true});
 const msg=res.resource?.message||await interaction.fetchReply(),col=msg.createMessageComponentCollector({time:30000});
 col.on("collect",async i=>{
  if(i.user.id!==interaction.user.id)return i.reply({content:"❌ No puedes usar estos botones.",flags:MessageFlags.Ephemeral});
  await i.deferUpdate();
  if(i.customId==="loan_cancel"){col.stop("cancelled");return interaction.editReply({components:[panel("❌ Solicitud cancelada","No se realizó ningún préstamo.",null,0xFF0000,LOAN_BANNER)]});}
  const fresh=await getUser(interaction.guild.id,interaction.user.id);await updateDebt(fresh);const gb=await bank(interaction.guild.id);
  if(fresh.debt>0||fresh.loanTaken||gb.balance<amount){col.stop("invalid");return interaction.editReply({components:[panel("❌ Préstamo no disponible","Las condiciones cambiaron antes de confirmar.",null,0xFF0000,LOAN_BANNER)]});}
  fresh.wallet+=amount;fresh.debt=debt;fresh.loanTaken=true;fresh.loanDate=new Date();gb.balance-=amount;await fresh.save();await gb.save();col.stop("confirmed");
  return interaction.editReply({components:[panel("🏦 Préstamo aprobado","💰 Has recibido **"+amount.toLocaleString()+" monedas**.\n\n📉 **Deuda inicial:** "+debt.toLocaleString()+" monedas\n\n⚠️ Usa /economy paydebt para reducirla.",null,0x00FF99,LOAN_BANNER)]});
 });
 col.on("end",async(_,r)=>{if(r==="time")await interaction.editReply({components:[panel("⌛ Tiempo agotado","No confirmaste el préstamo dentro de los 30 segundos.",null,0xFF0000,LOAN_BANNER)]}).catch(()=>{});});
}
async function runPayDebt(interaction){
 const amount=interaction.options.getInteger("cantidad"),u=await getUser(interaction.guild.id,interaction.user.id),added=await updateDebt(u),b=await bank(interaction.guild.id);
 if(u.debt<=0)return reply(interaction,"❌ Sin deuda","No tienes ninguna deuda activa.",0xFF0000,true,PAYDEBT_BANNER);
 if(Number(u.wallet||0)+Number(u.bank||0)<amount)return reply(interaction,"❌ Fondos insuficientes","No tienes suficiente dinero para pagar esa cantidad.",0xFF0000,true,PAYDEBT_BANNER);
 if(amount>u.debt)return reply(interaction,"❌ Cantidad inválida","Tu deuda actual es de **"+u.debt.toLocaleString()+" monedas**.",0xFF0000,true,PAYDEBT_BANNER);
 if(u.wallet>=amount)u.wallet-=amount;else{const r=amount-u.wallet;u.wallet=0;u.bank-=r;}u.debt-=amount;b.balance+=amount;
 if(u.debt<=0){u.debt=0;u.loanTaken=false;u.loanDate=null;}await u.save();await b.save();
 return reply(interaction,"💳 Pago de deuda realizado","💸 Has pagado **"+amount.toLocaleString()+" monedas**.\n\n📉 **Deuda restante:** "+u.debt.toLocaleString()+" monedas\n🏛️ **Estado:** "+(u.debt>0?"🔴 Deuda pendiente":"🟢 Sin deuda")+"\n💵 **Wallet:** "+u.wallet.toLocaleString()+"\n🏦 **Banco:** "+u.bank.toLocaleString()+"\n\n📈 **Intereses:** "+(added>0?"+"+added.toLocaleString()+" monedas":"No se generaron nuevos intereses"),0x00FF99,false,PAYDEBT_BANNER);
}
async function runDistribute(interaction){
 if(!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))return reply(interaction,"❌ Sin permisos","Necesitas permisos de **Administrador**.",0xFF0000,true,DISTRIBUTE_BANNER);
 const target=interaction.options.getUser("usuario"),amount=interaction.options.getInteger("cantidad");let b=await GlobalBank.findOne({guildId:interaction.guild.id});
 if(!b)return reply(interaction,"❌ Banco no disponible","El banco global no existe aún.",0xFF0000,true,DISTRIBUTE_BANNER);
 if(b.balance<amount)return reply(interaction,"🏦 Fondos insuficientes","Balance actual: **"+b.balance.toLocaleString()+" monedas**.",0xFF0000,true,DISTRIBUTE_BANNER);
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("global_confirm").setLabel("Confirmar").setEmoji("✅").setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId("global_cancel").setLabel("Cancelar").setEmoji("❌").setStyle(ButtonStyle.Secondary));
 const res=await interaction.reply({components:[panel("🏦 Confirmar distribución","👤 **Usuario:** "+target+"\n💰 **Cantidad:** "+amount.toLocaleString()+" monedas\n\n⏱️ Tienes **30 segundos**.",row,0x8A2BE2,DISTRIBUTE_BANNER)],flags:MessageFlags.IsComponentsV2,withResponse:true});
 const msg=res.resource?.message||await interaction.fetchReply(),col=msg.createMessageComponentCollector({time:30000});
 col.on("collect",async i=>{
  if(i.user.id!==interaction.user.id)return i.reply({content:"❌ No puedes usar estos botones.",flags:MessageFlags.Ephemeral});
  await i.deferUpdate();
  if(i.customId==="global_cancel"){col.stop("cancelled");return interaction.editReply({components:[panel("❌ Operación cancelada","No se realizó ningún cambio.",null,0xFF0000,DISTRIBUTE_BANNER)]});}
  const gb=await GlobalBank.findOne({guildId:interaction.guild.id});if(!gb||gb.balance<amount){col.stop("insufficient");return interaction.editReply({components:[panel("🏦 Fondos insuficientes","El balance global cambió y ya no hay suficientes monedas.",null,0xFF0000,DISTRIBUTE_BANNER)]});}
  const user=await getUser(interaction.guild.id,target.id);user.wallet+=amount;gb.balance-=amount;gb.totalDistributed=Number(gb.totalDistributed||0)+amount;await user.save();await gb.save();col.stop("confirmed");
  return interaction.editReply({components:[panel("🏦 Dinero distribuido","👤 **Usuario:** "+target+"\n💰 **Cantidad:** "+amount.toLocaleString()+" monedas\n🏦 **Nuevo balance:** "+gb.balance.toLocaleString()+" monedas",null,0x00FF99,DISTRIBUTE_BANNER)]});
 });
 col.on("end",async(_,r)=>{if(r==="time")await interaction.editReply({components:[panel("⌛ Tiempo agotado","No confirmaste la distribución.",null,0xFF0000,DISTRIBUTE_BANNER)]}).catch(()=>{});});
}
module.exports={runGlobalBank,runDonate,runLoan,runPayDebt,runDistribute};