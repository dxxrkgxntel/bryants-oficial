const {
 SlashCommandBuilder, PermissionFlagsBits, ChannelType,
 ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
 SeparatorSpacingSize, MessageFlags
}=require("discord.js");
const AntiScam=require("../../Models/AntiScam");
const ANTISCAM_BANNER="https://i.imgur.com/BTSUMgG.png";

function panel(title,text,color=0x8A2BE2){
 return new ContainerBuilder().setAccentColor(color)
  .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(ANTISCAM_BANNER)))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
  .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}
function respond(i,title,text,color=0x8A2BE2){
 return i.editReply({components:[panel(title,text,color)],flags:MessageFlags.IsComponentsV2});
}
async function getConfig(guildId){
 let config=await AntiScam.findOne({guildId});
 if(!config)config=await AntiScam.create({guildId});
 return config;
}
const punishmentNames={delete:"Eliminar mensaje",timeout:"Timeout",kick:"Expulsar",ban:"Banear"};

module.exports={
 data:new SlashCommandBuilder().setName("antiscam").setDescription("Configura el sistema AntiScam.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s=>s.setName("enable").setDescription("Activa el AntiScam."))
  .addSubcommand(s=>s.setName("disable").setDescription("Desactiva el AntiScam."))
  .addSubcommand(s=>s.setName("punishment").setDescription("Configura el castigo.")
   .addStringOption(o=>o.setName("tipo").setDescription("Tipo de castigo").setRequired(true)
    .addChoices({name:"Delete",value:"delete"},{name:"Timeout",value:"timeout"},{name:"Kick",value:"kick"},{name:"Ban",value:"ban"})))
  .addSubcommand(s=>s.setName("logs").setDescription("Canal de logs.")
   .addChannelOption(o=>o.setName("canal").setDescription("Canal de logs").setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s=>s.setName("status").setDescription("Ver configuración.")),
 async execute(i){
  await i.deferReply({flags:MessageFlags.Ephemeral});
  const sub=i.options.getSubcommand();
  const config=await getConfig(i.guild.id);

  if(sub==="enable"){
   if(config.enabled)return respond(i,"🛡️ AntiScam","El sistema ya está **activado**.",0xFFD700);
   config.enabled=true;await config.save();
   return respond(i,"✅ AntiScam activado","La protección AntiScam está activa en el servidor.",0x00FF99);
  }
  if(sub==="disable"){
   if(!config.enabled)return respond(i,"🛡️ AntiScam","El sistema ya está **desactivado**.",0xFFD700);
   config.enabled=false;await config.save();
   return respond(i,"❌ AntiScam desactivado","La protección AntiScam fue desactivada.",0xFF0000);
  }
  if(sub==="punishment"){
   const tipo=i.options.getString("tipo");
   config.punishment=tipo;await config.save();
   return respond(i,"⚒️ Castigo configurado",`Las detecciones AntiScam utilizarán **${punishmentNames[tipo]||tipo}**.`,0x00FF99);
  }
  if(sub==="logs"){
   const ch=i.options.getChannel("canal");
   config.logChannelId=ch.id;await config.save();
   return respond(i,"📜 Logs configurados",`Los registros de AntiScam se enviarán a ${ch}.`,0x00FF99);
  }
  if(sub==="status"){
   const logs=config.logChannelId
    ?(i.guild.channels.cache.has(config.logChannelId)?`<#${config.logChannelId}>`:`⚠️ Canal eliminado (${config.logChannelId})`)
    :"No configurado";
   return respond(i,"🛡️ Estado AntiScam",
    `**Estado:** ${config.enabled?"✅ Activado":"❌ Desactivado"}\n**Castigo:** ${punishmentNames[config.punishment]||config.punishment||"No configurado"}\n**Logs:** ${logs}`);
  }
 }
};