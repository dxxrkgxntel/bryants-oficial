const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");

const handlers = {
    botinfo: require("../../Utils/PublicHandlers/botinfo"),
    confesiones: require("../../Utils/PublicHandlers/confesiones"),
    embed: require("../../Utils/PublicHandlers/createEmbed"),
    ping: require("../../Utils/PublicHandlers/ping2"),
    reportar: require("../../Utils/PublicHandlers/reportar"),
    "server-icon": require("../../Utils/PublicHandlers/serverIcon"),
    "server-info": require("../../Utils/PublicHandlers/serverinfo"),
    sugerencia: require("../../Utils/PublicHandlers/suggest"),
    uptime: require("../../Utils/PublicHandlers/uptime"),
    "user-info": require("../../Utils/PublicHandlers/userinfo")
};

const { MessageFlags } = require("discord.js");
const PUBLIC_BANNER = "https://i.imgur.com/27zUS78.png";

function publicPanel(body, accent = 0x8A2BE2, media = null) {
    const components = [
        { type: 12, items: [{ media: { url: PUBLIC_BANNER } }] },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: body }
    ];
    if (media) components.push({ type: 14, divider: true, spacing: 1 }, { type: 12, items: [{ media: { url: media } }] });
    return { flags: MessageFlags.IsComponentsV2, components: [{ type: 17, accent_color: accent, components }] };
}

function patchPublicHandler(name, execute) {
    if (handlers[name]) handlers[name].execute = execute;
}

patchPublicHandler("botinfo", async interaction => {
    const client = interaction.client;
    const d=Math.floor(client.uptime/86400000), h=Math.floor(client.uptime/3600000)%24, m=Math.floor(client.uptime/60000)%60, s=Math.floor(client.uptime/1000)%60;
    const bytes=process.memoryUsage().heapUsed;
    const units=["B","KB","MB","GB"]; let i=0,n=bytes; while(n>=1024&&i<units.length-1){n/=1024;i++;}
    return interaction.reply(publicPanel(`## 🤖 BF Public • Bot Info
**Desarrollador:** @bryantdx
**Bot:** ${client.user.username}
**ID:** \`${client.user.id}\`
**Creado:** <t:${Math.floor(client.user.createdTimestamp/1000)}:D>

⏱️ **Uptime:** ${d}d ${h}h ${m}m ${s}s
📡 **Ping:** ${client.ws.ping}ms
🟢 **Node:** ${process.version}
💾 **Memoria:** ${n.toFixed(2)} ${units[i]}`));
});

patchPublicHandler("ping", async interaction =>
    interaction.reply(publicPanel(`## 🏓 BF Public • Ping
🏓 **Pong!**
📡 Latencia WebSocket: **${interaction.client.ws.ping}ms**`))
);

patchPublicHandler("uptime", async interaction => {
    const u=interaction.client.uptime;
    const d=Math.floor(u/86400000),h=Math.floor(u/3600000)%24,m=Math.floor(u/60000)%60,s=Math.floor(u/1000)%60;
    return interaction.reply(publicPanel(`## ⏱️ BF Public • Uptime
🤖 **${interaction.client.user.username}**
🟢 Activo durante **${d} días, ${h} horas, ${m} minutos y ${s} segundos**.`));
});

patchPublicHandler("server-icon", async interaction => {
    await interaction.deferReply();
    const icon=interaction.guild.iconURL({extension:"png",size:1024});
    if(!icon) return interaction.editReply(publicPanel("## 🖼️ BF Public • Server Icon\n❌ Este servidor no tiene icono.",0xED4245));
    return interaction.editReply(publicPanel(`## 🖼️ BF Public • Server Icon
### ${interaction.guild.name}
Solicitado por <@${interaction.user.id}>`,0x8A2BE2,icon));
});

patchPublicHandler("user-info", async interaction => {
    await interaction.deferReply({flags:MessageFlags.Ephemeral});
    const user=interaction.options.getUser("user")||interaction.user;
    const member=await interaction.guild.members.fetch(user.id).catch(()=>null);
    const badges=user.flags?.toArray()?.join(", ")||"Ninguna";
    return interaction.editReply(publicPanel(`## 👤 BF Public • User Info
### <@${user.id}>
🆔 **ID:** \`${user.id}\`
📅 **Cuenta creada:** <t:${Math.floor(user.createdTimestamp/1000)}:R>
📥 **Entró al servidor:** ${member?.joinedTimestamp?`<t:${Math.floor(member.joinedTimestamp/1000)}:R>`:"Desconocido"}
🚀 **Booster:** ${member?.premiumSince?"Sí":"No"}
🤖 **Bot:** ${user.bot?"Sí":"No"}
🎖️ **Insignias:** ${badges}`));
});

patchPublicHandler("server-info", async interaction => {
    await interaction.deferReply();
    const g=interaction.guild;
    await g.members.fetch().catch(()=>null);
    const bots=g.members.cache.filter(x=>x.user.bot).size;
    const text=g.channels.cache.filter(x=>x.isTextBased()).size;
    const voice=g.channels.cache.filter(x=>x.isVoiceBased()).size;
    const icon=g.iconURL({extension:"png",size:1024});
    return interaction.editReply(publicPanel(`## 🏠 BF Public • Server Info
### ${g.name}
🆔 **ID:** \`${g.id}\`
👑 **Dueño:** <@${g.ownerId}>
📅 **Creado:** <t:${Math.floor(g.createdTimestamp/1000)}:R>
👥 **Miembros:** ${g.memberCount}
👤 **Usuarios:** ${Math.max(0,g.memberCount-bots)}
🤖 **Bots:** ${bots}
💬 **Canales de texto:** ${text}
🎙️ **Canales de voz:** ${voice}
🎭 **Roles:** ${g.roles.cache.size}
😀 **Emojis:** ${g.emojis.cache.size}
💎 **Boosts:** ${g.premiumSubscriptionCount||0}
📈 **Nivel de boost:** ${g.premiumTier}`,0x8A2BE2,icon));
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName("public")
        .setDescription("Comandos públicos de Bryant's Oficial")
        .addSubcommand(s=>s.setName("botinfo").setDescription("Información sobre el bot"))
        .addSubcommand(s=>s.setName("confesiones").setDescription("Envía una confesión")
            .addStringOption(o=>o.setName("description").setDescription("Qué confesión deseas realizar").setMaxLength(2048).setRequired(true))
            .addStringOption(o=>o.setName("elegir").setDescription("Deseas que sea pública o privada").addChoices(
                { name: "Público", value: "p" },
                { name: "Privado", value: "c" }
            ).setRequired(true)))
        .addSubcommand(s=>s.setName("embed").setDescription("Crea un embed personalizado")
            .addStringOption(o=>o.setName("color").setDescription("Color hexadecimal").setRequired(false))
            .addStringOption(o=>o.setName("title").setDescription("Título").setRequired(false))
            .addStringOption(o=>o.setName("description").setDescription("Descripción").setRequired(false))
            .addAttachmentOption(o=>o.setName("thumbnail").setDescription("Thumbnail del embed").setRequired(false))
            .addAttachmentOption(o=>o.setName("image").setDescription("Imagen del embed").setRequired(false))
            .addStringOption(o=>o.setName("url").setDescription("URL del título").setRequired(false))
            .addStringOption(o=>o.setName("author").setDescription("Autor").setRequired(false))
            .addStringOption(o=>o.setName("timestamp").setDescription("Añadir fecha y hora").addChoices({name:"Sí",value:"si"},{name:"No",value:"no"}).setRequired(false))
            .addStringOption(o=>o.setName("footer").setDescription("Pie de página").setRequired(false)))
        .addSubcommand(s=>s.setName("ping").setDescription("Comprueba la respuesta del bot"))
        .addSubcommand(s=>s.setName("reportar").setDescription("Reporta a un usuario al equipo de moderación")
            .addUserOption(o=>o.setName("usuario").setDescription("Usuario que deseas reportar").setRequired(true))
            .addStringOption(o=>o.setName("razon").setDescription("Razón del reporte").setRequired(true)))
        .addSubcommand(s=>s.setName("server-icon").setDescription("Muestra la imagen del servidor"))
        .addSubcommand(s=>s.setName("server-info").setDescription("Información sobre el servidor"))
        .addSubcommand(s=>s.setName("sugerencia").setDescription("Crea una sugerencia"))
        .addSubcommand(s=>s.setName("uptime").setDescription("Muestra el tiempo activo del bot"))
        .addSubcommand(s=>s.setName("user-info").setDescription("Información sobre un usuario")
            .addUserOption(o=>o.setName("user").setDescription("Usuario a consultar").setRequired(false))),

    async execute(interaction) {
        const sub=interaction.options.getSubcommand();
        if(sub==="embed" && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
            return interaction.reply({content:"❌ Necesitas permisos de administrador para crear embeds.",flags:64});
        const handler=handlers[sub];
        if(!handler?.execute) return interaction.reply({content:"❌ Esta opción no está disponible.",flags:64});
        return handler.execute(interaction);
    }
};
