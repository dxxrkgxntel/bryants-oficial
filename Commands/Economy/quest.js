const {
 SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder,
 SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder,
 ButtonStyle, MessageFlags
} = require("discord.js");
const Quest = require("../../Models/Quest");
const UserQuest = require("../../Models/UserQuest");

const QUEST_LIST_BANNER = "https://i.imgur.com/W9cabP5.png";
const QUEST_CREATE_BANNER = "https://i.imgur.com/LP0v169.png";
const QUEST_EDIT_BANNER = "https://i.imgur.com/wb9F4Kz.png";
const QUEST_REMOVE_BANNER = "https://i.imgur.com/VhVn6nb.png";

function panel(title, text, row = null, color = 0x8A2BE2, banner = null) {
 const p = new ContainerBuilder().setAccentColor(color);
 if (banner) p.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(banner)));
 p
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
  .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
 if (row) p.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)).addActionRowComponents(row);
 return p;
}
function flags(ephemeral=false){ return ephemeral ? MessageFlags.IsComponentsV2|MessageFlags.Ephemeral : MessageFlags.IsComponentsV2; }
function admin(i){ return i.memberPermissions?.has(PermissionFlagsBits.Administrator); }
async function reply(i,title,text,color=0x8A2BE2,ephemeral=false,row=null,banner=null){
 return i.reply({components:[panel(title,text,row,color,banner)],flags:flags(ephemeral),withResponse:true});
}

async function list(i){
 const quests=await Quest.find({guildId:i.guild.id,enabled:true});
 if(!quests.length) return reply(i,"📜 Misiones","No hay misiones activas en este momento.",0xFF0000,true);
 const data=await UserQuest.findOne({userId:i.user.id,guildId:i.guild.id});
 const lines=quests.map(q=>{
  const uq=data?.quests.find(x=>x.questId===q.questId);
  const progress=Math.min(uq?.progress||0,q.goal);
  const done=uq?.completed||false;
  const type=q.type==="weekly"?"Semanal":"Diaria";
  return `${done?"✅":"📌"} **${q.name}** · ${type}\n> ${q.description}\n> 🎯 **${progress}/${q.goal}** · 💰 **${q.reward?.coins||0} monedas**`;
 });
 return reply(i,`📜 Misiones de ${i.user.username}`,lines.join("\n\n"),0x8A2BE2,true,null,QUEST_LIST_BANNER);
}
async function create(i){
 if(!admin(i)) return reply(i,"⛔ Sin permisos","Este subcomando es exclusivo para administradores.",0xFF0000,true);
 const questId=i.options.getString("id"), name=i.options.getString("nombre"), description=i.options.getString("descripcion");
 const type=i.options.getString("tipo"), category=i.options.getString("categoria"), goal=i.options.getInteger("objetivo"), coins=i.options.getInteger("recompensa");
 if(await Quest.exists({guildId:i.guild.id,questId})) return reply(i,"❌ ID duplicado","Ya existe una misión con ese ID.",0xFF0000,true);
 await Quest.create({guildId:i.guild.id,questId,name,description,type,category,goal,reward:{coins}});
 return reply(i,"✅ Misión creada",`**${name}** fue creada correctamente.\n\n> 🆔 ${questId}\n> 📂 ${category}\n> 🎯 ${goal}\n> 💰 ${coins.toLocaleString()} monedas`,0x00FF99,false,null,QUEST_CREATE_BANNER);
}
async function edit(i){
 if(!admin(i)) return reply(i,"⛔ Sin permisos","Este subcomando es exclusivo para administradores.",0xFF0000,true);
 const quest=await Quest.findOne({guildId:i.guild.id,questId:i.options.getString("id")});
 if(!quest) return reply(i,"❌ Misión no encontrada","No existe una misión con ese ID.",0xFF0000,true);
 const name=i.options.getString("nombre"),description=i.options.getString("descripcion"),goal=i.options.getInteger("objetivo"),coins=i.options.getInteger("recompensa"),enabled=i.options.getBoolean("activa");
 if(name!==null) quest.name=name;if(description!==null) quest.description=description;if(goal!==null) quest.goal=goal;if(coins!==null) quest.reward.coins=coins;if(enabled!==null) quest.enabled=enabled;
 await quest.save();
 return reply(i,"✏️ Misión actualizada",`**${quest.name}** se actualizó correctamente.\n\n> 🎯 Objetivo: **${quest.goal}**\n> 💰 Recompensa: **${quest.reward.coins} monedas**\n> Estado: **${quest.enabled?"Activa":"Desactivada"}**`,0xFFD700,false,null,QUEST_EDIT_BANNER);
}
async function remove(i){
 if(!admin(i)) return reply(i,"⛔ Sin permisos","Este subcomando es exclusivo para administradores.",0xFF0000,true);
 const quest=await Quest.findOne({guildId:i.guild.id,questId:i.options.getString("id")});
 if(!quest) return reply(i,"❌ Misión no encontrada","No existe una misión con ese ID.",0xFF0000,true);
 const yes=`quest_delete_yes_${i.id}`,no=`quest_delete_no_${i.id}`;
 const row=new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(yes).setLabel("Eliminar").setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId(no).setLabel("Cancelar").setStyle(ButtonStyle.Secondary));
 const response=await reply(i,"⚠️ Eliminar misión",`¿Deseas eliminar definitivamente **${quest.name}**?\n\nEsta acción no se puede deshacer.`,0xFF0000,true,row,QUEST_REMOVE_BANNER);
 const msg=response.resource?.message||await i.fetchReply();
 const col=msg.createMessageComponentCollector({time:30000,filter:x=>x.user.id===i.user.id&&(x.customId===yes||x.customId===no),max:1});
 col.on("collect",async x=>{await x.deferUpdate();if(x.customId===no)return i.editReply({components:[panel("❎ Eliminación cancelada",`**${quest.name}** no fue eliminada.`,null,0x8A2BE2,QUEST_REMOVE_BANNER)]});
  const deleted=await Quest.findOneAndDelete({_id:quest._id,guildId:i.guild.id});
  return i.editReply({components:[panel(deleted?"🗑️ Misión eliminada":"❌ No se pudo eliminar",deleted?`**${quest.name}** fue eliminada correctamente.`:"La misión ya no existe.",null,deleted?0x00FF99:0xFF0000,QUEST_REMOVE_BANNER)]});
 });
 col.on("end",async collected=>{if(!collected.size) await i.editReply({components:[panel("⌛ Confirmación expirada","No se eliminó ninguna misión.",null,0x8A2BE2,QUEST_REMOVE_BANNER)]}).catch(()=>{});});
}

module.exports={
 data:new SlashCommandBuilder().setName("quest").setDescription("Sistema de misiones de Bryant's Family")
  .addSubcommand(s=>s.setName("list").setDescription("Muestra tus misiones activas"))
  .addSubcommand(s=>s.setName("create").setDescription("Crea una misión (Administrador)")
   .addStringOption(o=>o.setName("id").setDescription("ID único de la misión").setRequired(true))
   .addStringOption(o=>o.setName("nombre").setDescription("Nombre").setRequired(true))
   .addStringOption(o=>o.setName("descripcion").setDescription("Descripción").setRequired(true))
   .addStringOption(o=>o.setName("tipo").setDescription("Tipo").setRequired(true).addChoices({name:"Diaria",value:"daily"},{name:"Semanal",value:"weekly"}))
   .addStringOption(o=>o.setName("categoria").setDescription("Categoría").setRequired(true).addChoices({name:"Mensajes",value:"messages"},{name:"Voz (minutos)",value:"voice"},{name:"Economía",value:"economy"},{name:"Juegos",value:"games"}))
   .addIntegerOption(o=>o.setName("objetivo").setDescription("Objetivo").setRequired(true).setMinValue(1))
   .addIntegerOption(o=>o.setName("recompensa").setDescription("Monedas de recompensa").setRequired(true).setMinValue(0)))
  .addSubcommand(s=>s.setName("edit").setDescription("Edita una misión (Administrador)")
   .addStringOption(o=>o.setName("id").setDescription("ID de la misión").setRequired(true))
   .addStringOption(o=>o.setName("nombre").setDescription("Nuevo nombre"))
   .addStringOption(o=>o.setName("descripcion").setDescription("Nueva descripción"))
   .addIntegerOption(o=>o.setName("objetivo").setDescription("Nuevo objetivo").setMinValue(1))
   .addIntegerOption(o=>o.setName("recompensa").setDescription("Nueva recompensa").setMinValue(0))
   .addBooleanOption(o=>o.setName("activa").setDescription("Activa o desactiva la misión")))
  .addSubcommand(s=>s.setName("remove").setDescription("Elimina una misión (Administrador)")
   .addStringOption(o=>o.setName("id").setDescription("ID de la misión").setRequired(true))),
 async execute(i){const s=i.options.getSubcommand();if(s==="list")return list(i);if(s==="create")return create(i);if(s==="edit")return edit(i);if(s==="remove")return remove(i);}
};