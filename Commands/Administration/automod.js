const {
 SlashCommandBuilder, PermissionFlagsBits, ChannelType,
 AutoModerationRuleEventType, AutoModerationRuleTriggerType, AutoModerationActionType,
 ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags
}=require("discord.js");
const AUTOMOD_BANNER="https://i.imgur.com/98lH1q4.png";

function panel(title,text,color=0x8A2BE2){
 return new ContainerBuilder().setAccentColor(color)
  .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(AUTOMOD_BANNER)))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
  .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
  .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}
function respond(i,title,text,color=0x8A2BE2){
 return i.editReply({components:[panel(title,text,color)],flags:MessageFlags.IsComponentsV2});
}
function existing(guild,name){return guild.autoModerationRules.cache.find(r=>r.name===name);}
const blockAction=customMessage=>[{type:AutoModerationActionType.BlockMessage,metadata:{customMessage}}];

module.exports={
 data:new SlashCommandBuilder().setName("automod").setDescription("Configura el AutoMod nativo de Discord.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s=>s.setName("flagged-words").setDescription("Bloquea insultos, contenido sexual y slurs."))
  .addSubcommand(s=>s.setName("spam-messages").setDescription("Bloquea mensajes detectados como spam."))
  .addSubcommand(s=>s.setName("mention-spam").setDescription("Bloquea spam de menciones.")
   .addIntegerOption(o=>o.setName("number").setDescription("Cantidad máxima de menciones").setRequired(true).setMinValue(1).setMaxValue(50)))
  .addSubcommand(s=>s.setName("keyword").setDescription("Bloquea una palabra o frase.")
   .addStringOption(o=>o.setName("word").setDescription("Palabra o frase a bloquear").setRequired(true).setMaxLength(60)))
  .addSubcommand(s=>s.setName("anti-links").setDescription("Bloquea enlaces.")
   .addChannelOption(o=>o.setName("channel").setDescription("Canal permitido").addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s=>s.setName("anti-invites").setDescription("Bloquea invitaciones de Discord.")),
 async execute(i,client){
  await i.deferReply({flags:MessageFlags.Ephemeral});
  if(!i.member.permissions.has(PermissionFlagsBits.Administrator))
   return respond(i,"⛔ Sin permisos","Necesitas **Administrador** para configurar AutoMod.",0xFF0000);
  const {guild,options}=i,sub=options.getSubcommand();
  try{
   if(sub==="flagged-words"){
    const name=`Block profanity by ${client.user.id}`;
    if(existing(guild,name))return respond(i,"⚠️ Regla existente","La regla de palabras ofensivas ya está activa.",0xFFD700);
    await guild.autoModerationRules.create({name,enabled:true,eventType:AutoModerationRuleEventType.MessageSend,
     triggerType:AutoModerationRuleTriggerType.KeywordPreset,triggerMetadata:{presets:[1,2,3]},
     actions:blockAction(`⚠️ Tu mensaje fue bloqueado por el AutoMod de ${guild.name}.`)});
    return respond(i,"✅ Palabras ofensivas","La protección nativa de Discord quedó activada.",0x00FF99);
   }
   if(sub==="spam-messages"){
    const name=`Anti Spam by ${client.user.id}`;
    if(existing(guild,name))return respond(i,"⚠️ Regla existente","La regla Anti Spam ya está activa.",0xFFD700);
    await guild.autoModerationRules.create({name,enabled:true,eventType:AutoModerationRuleEventType.MessageSend,
     triggerType:AutoModerationRuleTriggerType.Spam,actions:blockAction("⚠️ Spam detectado.")});
    return respond(i,"✅ Anti Spam","Discord AutoMod ahora bloqueará mensajes detectados como spam.",0x00FF99);
   }
   if(sub==="mention-spam"){
    const number=options.getInteger("number"),name=`Mention Spam by ${client.user.id}`;
    if(existing(guild,name))return respond(i,"⚠️ Regla existente","Ya existe una regla Anti Mention Spam.",0xFFD700);
    await guild.autoModerationRules.create({name,enabled:true,eventType:AutoModerationRuleEventType.MessageSend,
     triggerType:AutoModerationRuleTriggerType.MentionSpam,triggerMetadata:{mentionTotalLimit:number},
     actions:blockAction("⚠️ Demasiadas menciones detectadas.")});
    return respond(i,"✅ Anti Mention Spam",`Límite configurado en **${number} menciones**.`,0x00FF99);
   }
   if(sub==="keyword"){
    const word=options.getString("word").trim();
    if(!word)return respond(i,"⚠️ Palabra inválida","Debes indicar una palabra o frase válida.",0xFFD700);
    const name=`Keyword Block: ${word}`;
    if(existing(guild,name))return respond(i,"⚠️ Regla existente",`**${word}** ya tiene una regla de bloqueo.`,0xFFD700);
    await guild.autoModerationRules.create({name,enabled:true,eventType:AutoModerationRuleEventType.MessageSend,
     triggerType:AutoModerationRuleTriggerType.Keyword,triggerMetadata:{keywordFilter:[word]},
     actions:blockAction("⚠️ Esa palabra está bloqueada en este servidor.")});
    return respond(i,"✅ Keyword bloqueada",`La palabra o frase **${word}** ahora está bloqueada.`,0x00FF99);
   }
   if(sub==="anti-links"){
    const ch=options.getChannel("channel"),name=`Anti Links by ${client.user.id}`;
    if(existing(guild,name))return respond(i,"⚠️ Regla existente","La regla Anti Links de AutoMod ya está activa.",0xFFD700);
    await guild.autoModerationRules.create({name,enabled:true,eventType:AutoModerationRuleEventType.MessageSend,
     triggerType:AutoModerationRuleTriggerType.Keyword,triggerMetadata:{regexPatterns:["https?://[^\\s]+"]},
     actions:blockAction("⚠️ Los links están bloqueados en este servidor."),exemptChannels:ch?[ch.id]:[]});
    return respond(i,"✅ Anti Links",ch?`Enlaces bloqueados. Canal permitido: ${ch}`:"Los enlaces quedaron bloqueados por Discord AutoMod.",0x00FF99);
   }
   if(sub==="anti-invites"){
    const name=`Anti Invites by ${client.user.id}`;
    if(existing(guild,name))return respond(i,"⚠️ Regla existente","La regla Anti Invites ya está activa.",0xFFD700);
    await guild.autoModerationRules.create({name,enabled:true,eventType:AutoModerationRuleEventType.MessageSend,
     triggerType:AutoModerationRuleTriggerType.Keyword,triggerMetadata:{keywordFilter:["discord.gg","discord.com/invite"]},
     actions:blockAction("⚠️ Las invitaciones de Discord están bloqueadas.")});
    return respond(i,"✅ Anti Invitaciones","Las invitaciones de Discord quedaron bloqueadas.",0x00FF99);
   }
  }catch(err){
   console.error("[AutoMod]",err);
   const detail=err?.code===50035?"Discord rechazó la configuración de la regla. Revisa los límites de AutoMod y los valores indicados.":"No se pudo crear la regla de AutoMod.";
   return respond(i,"❌ Error de AutoMod",detail,0xFF0000);
  }
 }
};