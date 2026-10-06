const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("public")
        .setDescription("Comandos públicos de Bryant's Oficial")
        .addSubcommand(s=>s.setName("botinfo").setDescription("Información sobre el bot"))
        .addSubcommand(s=>s.setName("confesiones").setDescription("Envía una confesión").addStringOption(o=>o.setName("description").setDescription("Qué deseas confesar").setRequired(true)))
        .addSubcommand(s=>s.setName("embed").setDescription("Crea un embed personalizado")
            .addStringOption(o=>o.setName("color").setDescription("Color hexadecimal").setRequired(false))
            .addStringOption(o=>o.setName("title").setDescription("Título").setRequired(false))
            .addStringOption(o=>o.setName("description").setDescription("Descripción").setRequired(false))
            .addStringOption(o=>o.setName("thumbnail").setDescription("URL del thumbnail").setRequired(false))
            .addStringOption(o=>o.setName("image").setDescription("URL de imagen").setRequired(false))
            .addStringOption(o=>o.setName("url").setDescription("URL del título").setRequired(false))
            .addStringOption(o=>o.setName("author").setDescription("Autor").setRequired(false))
            .addBooleanOption(o=>o.setName("timestamp").setDescription("Añadir fecha y hora").setRequired(false))
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
