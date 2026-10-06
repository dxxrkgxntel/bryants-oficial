const {
 SlashCommandBuilder, PermissionFlagsBits, ChannelType,
 ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
 SeparatorSpacingSize, MessageFlags
}=require("discord.js");
const ImageConfig=require("../../Models/ImageConfig");

function panel(title,text,color=0x8A2BE2){
 return new ContainerBuilder().setAccentColor(color)
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
  .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}
function respond(i,title,text,color=0x8A2BE2){
 return i.editReply({components:[panel(title,text,color)],flags:MessageFlags.IsComponentsV2});
}
async function getConfig(guildId){
 let config=await ImageConfig.findOne({guildId});
 if(!config)config=await ImageConfig.create({guildId,allowedChannels:[]});
 if(!Array.isArray(config.allowedChannels))config.allowedChannels=[];
 return config;
}

module.exports={
 data:new SlashCommandBuilder().setName("antimultimedia").setDescription("Sistema AntiMultimedia")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s=>s.setName("add").setDescription("Permitir imágenes en un canal")
   .addChannelOption(o=>o.setName("canal").setDescription("Canal").setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s=>s.setName("remove").setDescription("Quitar canal permitido")
   .addChannelOption(o=>o.setName("canal").setDescription("Canal").setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s=>s.setName("list").setDescription("Ver canales permitidos"))
  .addSubcommand(s=>s.setName("log").setDescription("Configurar logs")
   .addChannelOption(o=>o.setName("canal").setDescription("Canal de logs").setRequired(true).addChannelTypes(ChannelType.GuildText))
   .addAttachmentOption(o=>o.setName("thumbnail").setDescription("Thumbnail"))
   .addAttachmentOption(o=>o.setName("image").setDescription("Imagen"))),
 async execute(i){
  await i.deferReply({flags:MessageFlags.Ephemeral});
  const sub=i.options.getSubcommand();
  const config=await getConfig(i.guild.id);

  if(sub==="add"){
   const ch=i.options.getChannel("canal");
   if(config.allowedChannels.includes(ch.id))return respond(i,"⚠️ Canal ya permitido",`${ch} ya permite contenido multimedia.`,0xFFD700);
   if(config.allowedChannels.length>=5)return respond(i,"❌ Límite alcanzado","Solo puedes configurar **5 canales** permitidos.",0xFF0000);
   config.allowedChannels.push(ch.id);await config.save();
   return respond(i,"✅ Canal permitido",`El contenido multimedia ahora está permitido en ${ch}.`,0x00FF99);
  }

  if(sub==="remove"){
   const ch=i.options.getChannel("canal");
   if(!config.allowedChannels.includes(ch.id))return respond(i,"⚠️ Canal no configurado",`${ch} no forma parte de los canales permitidos.`,0xFFD700);
   config.allowedChannels=config.allowedChannels.filter(id=>id!==ch.id);await config.save();
   return respond(i,"✅ Canal eliminado",`${ch} fue eliminado de los canales permitidos.`,0x00FF99);
  }

  if(sub==="list"){
   const valid=config.allowedChannels.filter(id=>i.guild.channels.cache.has(id));
   const stale=config.allowedChannels.filter(id=>!i.guild.channels.cache.has(id));
   let text=valid.length?valid.map(id=>`<#${id}>`).join("\n"):"Ninguno";
   text+=`\n\n**Total:** ${valid.length}/5`;
   if(stale.length)text+=`\n**Canales eliminados guardados:** ${stale.length}`;
   return respond(i,"📸 Canales multimedia permitidos",text);
  }

  if(sub==="log"){
   const ch=i.options.getChannel("canal");
   const thumbnail=i.options.getAttachment("thumbnail");
   const image=i.options.getAttachment("image");
   if(thumbnail&&!thumbnail.contentType?.startsWith("image/"))return respond(i,"❌ Thumbnail inválida","El archivo de thumbnail debe ser una imagen.",0xFF0000);
   if(image&&!image.contentType?.startsWith("image/"))return respond(i,"❌ Imagen inválida","El archivo seleccionado debe ser una imagen.",0xFF0000);
   config.logChannel=ch.id;
   if(thumbnail?.url)config.thumbnail=thumbnail.url;
   if(image?.url)config.image=image.url;
   await config.save();
   return respond(i,"📜 Logs configurados",`Los registros del sistema multimedia se enviarán a ${ch}.`,0x00FF99);
  }
 }
};