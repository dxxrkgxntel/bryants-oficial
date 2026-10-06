const {
 SlashCommandBuilder, PermissionFlagsBits, ChannelType,
 ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
 SeparatorSpacingSize, MessageFlags
} = require("discord.js");
const AntiLinksConfig=require("../../Models/AntiLinksConfig");

function panel(title,text,color=0x8A2BE2){
 return new ContainerBuilder().setAccentColor(color)
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
  .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}
function reply(i,title,text,color=0x8A2BE2){return i.reply({components:[panel(title,text,color)],flags:MessageFlags.IsComponentsV2|MessageFlags.Ephemeral});}
async function getConfig(guildId){
 let data=await AntiLinksConfig.findOne({guildId});
 if(!data)data=await AntiLinksConfig.create({guildId,enabled:false,allowedChannels:[],logsChannel:null});
 if(!Array.isArray(data.allowedChannels))data.allowedChannels=[];
 return data;
}

module.exports={
 data:new SlashCommandBuilder().setName("antilinks").setDescription("Sistema Anti Links")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s=>s.setName("toggle").setDescription("Activar o desactivar AntiLinks"))
  .addSubcommand(s=>s.setName("whitelist").setDescription("Agregar canal permitido")
   .addChannelOption(o=>o.setName("canal").setDescription("Canal permitido").setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s=>s.setName("remove").setDescription("Quitar canal permitido")
   .addChannelOption(o=>o.setName("canal").setDescription("Canal a quitar").setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s=>s.setName("list").setDescription("Ver configuración AntiLinks"))
  .addSubcommand(s=>s.setName("logs").setDescription("Configurar canal de logs")
   .addChannelOption(o=>o.setName("canal").setDescription("Canal de logs").setRequired(true).addChannelTypes(ChannelType.GuildText))),
 async execute(i){
  const sub=i.options.getSubcommand();
  const data=await getConfig(i.guild.id);

  if(sub==="toggle"){
   data.enabled=!data.enabled;await data.save();
   return reply(i,data.enabled?"✅ AntiLinks activado":"❌ AntiLinks desactivado",
    data.enabled?"El filtro de enlaces está **activo** en el servidor.":"El filtro de enlaces está **desactivado** en el servidor.",
    data.enabled?0x00FF99:0xFF0000);
  }

  if(sub==="whitelist"){
   const ch=i.options.getChannel("canal");
   if(data.allowedChannels.includes(ch.id))return reply(i,"⚠️ Canal ya permitido",`${ch} ya forma parte de la whitelist.`,0xFFD700);
   data.allowedChannels.push(ch.id);await data.save();
   return reply(i,"✅ Canal permitido",`${ch} fue agregado correctamente a la whitelist de AntiLinks.`,0x00FF99);
  }

  if(sub==="remove"){
   const ch=i.options.getChannel("canal");
   if(!data.allowedChannels.includes(ch.id))return reply(i,"⚠️ Canal no encontrado",`${ch} no forma parte de la whitelist.`,0xFFD700);
   data.allowedChannels=data.allowedChannels.filter(id=>id!==ch.id);await data.save();
   return reply(i,"✅ Canal eliminado",`${ch} fue eliminado de la whitelist de AntiLinks.`,0x00FF99);
  }

  if(sub==="list"){
   const channels=data.allowedChannels.length
    ?data.allowedChannels.map(id=>i.guild.channels.cache.has(id)?`<#${id}>`:`⚠️ Canal eliminado (${id})`).join("\n")
    :"Ninguno";
   const logs=data.logsChannel
    ?(i.guild.channels.cache.has(data.logsChannel)?`<#${data.logsChannel}>`:`⚠️ Canal eliminado (${data.logsChannel})`)
    :"No configurado";
   return reply(i,"🔗 Configuración AntiLinks",
    `**Estado:** ${data.enabled?"✅ Activado":"❌ Desactivado"}\n**Logs:** ${logs}\n\n### Canales permitidos\n${channels}`);
  }

  if(sub==="logs"){
   const ch=i.options.getChannel("canal");
   data.logsChannel=ch.id;await data.save();
   return reply(i,"📝 Logs configurados",`Los registros de AntiLinks se enviarán a ${ch}.`,0x00FF99);
  }
 }
};