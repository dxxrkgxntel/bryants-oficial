const {
 SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder,
 SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags
} = require("discord.js");
const Prestige=require("../../Models/Prestige");
const PrestigeConfig=require("../../Models/PrestigeConfig");
const Level=require("../../Models/Level");
const Economy=require("../../Models/EconomyUser");

const PRESTIGE_INFO_BANNER="https://i.imgur.com/K8A2QNz.png";
const PRESTIGE_CLAIM_BANNER="https://i.imgur.com/82FA5VI.png";
const PRESTIGE_ADMIN_BANNER="https://i.imgur.com/45XWMHw.png";

function panel(title,text,color=0x8A2BE2,banner=null){
 const p=new ContainerBuilder().setAccentColor(color);
 if(banner)p.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(banner)));
 return p.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
  .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}
function flags(ephemeral=false){return ephemeral?MessageFlags.IsComponentsV2|MessageFlags.Ephemeral:MessageFlags.IsComponentsV2;}
function reply(i,title,text,color=0x8A2BE2,ephemeral=false,banner=null){return i.reply({components:[panel(title,text,color,banner)],flags:flags(ephemeral)});}
function isAdmin(i){return i.memberPermissions?.has(PermissionFlagsBits.Administrator);}
async function getConfig(guildId){
 let c=await PrestigeConfig.findOne({guildId});
 if(!c)c=await PrestigeConfig.create({guildId,enabled:false,prestigeRoles:{},prestigeRewards:{}});
 return c;
}
async function getPrestige(guildId,userId){
 let p=await Prestige.findOne({guildId,userId});
 if(!p)p=await Prestige.create({guildId,userId,prestige:0});
 return p;
}

module.exports={
 data:new SlashCommandBuilder().setName("prestige").setDescription("Sistema de prestigios.")
  .addSubcommand(s=>s.setName("setup").setDescription("Configura los 5 prestigios (Administrador)")
   .addRoleOption(o=>o.setName("prestige1").setDescription("Rol de prestigio 1").setRequired(true))
   .addIntegerOption(o=>o.setName("reward1").setDescription("Monedas de prestigio 1").setRequired(true).setMinValue(0))
   .addRoleOption(o=>o.setName("prestige2").setDescription("Rol de prestigio 2").setRequired(true))
   .addIntegerOption(o=>o.setName("reward2").setDescription("Monedas de prestigio 2").setRequired(true).setMinValue(0))
   .addRoleOption(o=>o.setName("prestige3").setDescription("Rol de prestigio 3").setRequired(true))
   .addIntegerOption(o=>o.setName("reward3").setDescription("Monedas de prestigio 3").setRequired(true).setMinValue(0))
   .addRoleOption(o=>o.setName("prestige4").setDescription("Rol de prestigio 4").setRequired(true))
   .addIntegerOption(o=>o.setName("reward4").setDescription("Monedas de prestigio 4").setRequired(true).setMinValue(0))
   .addRoleOption(o=>o.setName("prestige5").setDescription("Rol de prestigio 5").setRequired(true))
   .addIntegerOption(o=>o.setName("reward5").setDescription("Monedas de prestigio 5").setRequired(true).setMinValue(0)))
  .addSubcommand(s=>s.setName("enable").setDescription("Activa el sistema (Administrador)"))
  .addSubcommand(s=>s.setName("disable").setDescription("Desactiva el sistema (Administrador)"))
  .addSubcommand(s=>s.setName("claim").setDescription("Reclama tu siguiente prestigio"))
  .addSubcommand(s=>s.setName("info").setDescription("Muestra tu información de prestigio")),
 async execute(i){
  const sub=i.options.getSubcommand(),guildId=i.guild.id,userId=i.user.id;
  const config=await getConfig(guildId);

  if(["setup","enable","disable"].includes(sub)&&!isAdmin(i))
   return reply(i,"⛔ Sin permisos","Este subcomando es exclusivo para administradores.",0xFF0000,true,PRESTIGE_ADMIN_BANNER);

  if(sub==="setup"){
   const roles={},rewards={};
   for(let n=1;n<=5;n++){roles[n]=i.options.getRole(`prestige${n}`).id;rewards[n]=i.options.getInteger(`reward${n}`);}
   config.prestigeRoles=roles;config.prestigeRewards=rewards;await config.save();
   return reply(i,"👑 Prestige configurado","Los **5 prestigios** fueron configurados correctamente.\n\nRoles y recompensas ya están listos para utilizarse.",0x00FF99,true,PRESTIGE_ADMIN_BANNER);
  }
  if(sub==="enable"){config.enabled=true;await config.save();return reply(i,"✅ Prestige activado","El sistema de prestigios está activo.",0x00FF99,true,PRESTIGE_ADMIN_BANNER);}
  if(sub==="disable"){config.enabled=false;await config.save();return reply(i,"❌ Prestige desactivado","El sistema de prestigios fue desactivado.",0xFF0000,true,PRESTIGE_ADMIN_BANNER);}

  if(!config.enabled)return reply(i,"🔒 Prestige desactivado","El sistema de prestigios está desactivado actualmente.",0xFF0000,true,sub==="info"?PRESTIGE_INFO_BANNER:PRESTIGE_CLAIM_BANNER);

  const prestige=await getPrestige(guildId,userId);
  if(sub==="info"){
   const next=Math.min(prestige.prestige+1,5);
   const max=prestige.prestige>=5;
   const reward=max?0:Number(config.prestigeRewards?.[next]||0);
   const roleId=max?null:config.prestigeRoles?.[next];
   return reply(i,"👑 Sistema Prestige",
    `🏆 **Prestigio actual:** ${prestige.prestige} / 5\n📈 **Nivel requerido:** 50\n\n`+
    (max?"🌟 Ya alcanzaste el prestigio máximo.":`🎯 **Siguiente prestigio:** ${next}\n🎁 **Recompensa:** ${reward.toLocaleString()} monedas\n🎭 **Rol:** ${roleId?`<@&${roleId}>`:"No configurado"}`)+
    "\n\nAl reclamar, tu nivel y XP se reinician a **nivel 1 / 0 XP**.",0x8A2BE2,true);
  }

  if(sub==="claim"){
   if(prestige.prestige>=5)return reply(i,"🌟 Prestigio máximo","Ya alcanzaste el prestigio máximo.",0xFFD700,true,PRESTIGE_CLAIM_BANNER);
   const level=await Level.findOne({guildId,userId});
   if(!level||level.level<50)return reply(i,"📈 Nivel insuficiente","Necesitas llegar a **nivel 50** para reclamar el siguiente prestigio.",0xFF0000,true,PRESTIGE_CLAIM_BANNER);

   const next=prestige.prestige+1;
   const roleId=config.prestigeRoles?.[next];
   const reward=Number(config.prestigeRewards?.[next]);
   if(!roleId||!Number.isFinite(reward))return reply(i,"⚠️ Prestige incompleto",`El **Prestigio ${next}** no está configurado correctamente. Contacta a un administrador.`,0xFF0000,true,PRESTIGE_CLAIM_BANNER);

   const role=await i.guild.roles.fetch(roleId).catch(()=>null);
   if(!role)return reply(i,"⚠️ Rol no disponible",`El rol configurado para **Prestigio ${next}** ya no existe.`,0xFF0000,true,PRESTIGE_CLAIM_BANNER);
   const me=i.guild.members.me;
   if(!me?.permissions.has(PermissionFlagsBits.ManageRoles)||role.position>=me.roles.highest.position)
    return reply(i,"⚠️ No puedo entregar el rol","El bot necesita **Gestionar roles** y su rol debe estar por encima del rol de prestigio. No se realizó ningún cambio.",0xFF0000,true,PRESTIGE_CLAIM_BANNER);

   try{await i.member.roles.add(roleId);}
   catch{return reply(i,"❌ No se pudo entregar el rol","No se realizó ningún cambio en tu nivel, prestigio o dinero.",0xFF0000,true,PRESTIGE_CLAIM_BANNER);}

   try{
    let economy=await Economy.findOne({guildId,userId});
    if(!economy)economy=await Economy.create({guildId,userId,wallet:0,bank:0});
    economy.wallet+=reward;prestige.prestige=next;level.level=1;level.xp=0;
    await economy.save();await prestige.save();await level.save();
   }catch(err){
    await i.member.roles.remove(roleId).catch(()=>{});
    console.error("Error aplicando Prestige:",err);
    return reply(i,"❌ Error al aplicar Prestige","Ocurrió un error guardando los cambios. El rol entregado fue revertido cuando fue posible.",0xFF0000,true,PRESTIGE_CLAIM_BANNER);
   }
   return reply(i,"👑 Prestigio reclamado",
    `🎉 ${i.user} alcanzó **Prestigio ${next}**.\n\n💰 **Recompensa:** +${reward.toLocaleString()} monedas\n🎭 **Rol:** ${role}\n🔄 **Nivel:** reiniciado a 1\n✨ **XP:** reiniciada a 0`,0x8A2BE2,false,PRESTIGE_CLAIM_BANNER);
  }
 }
};