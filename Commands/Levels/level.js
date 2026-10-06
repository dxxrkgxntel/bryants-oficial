const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

const handlers = {
    rank: require("../../Utils/LevelHandlers/rank"),
    perfil: require("../../Utils/LevelHandlers/perfil"),
    top: require("../../Utils/LevelHandlers/leaderboard2"),
    "give-xp": require("../../Utils/LevelHandlers/give-xp"),
    "remove-xp": require("../../Utils/LevelHandlers/remove-xp"),
    channel: require("../../Utils/LevelHandlers/set-level-channel"),
    role: require("../../Utils/LevelHandlers/setLevelRole")
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("level")
        .setDescription("Sistema de niveles de Bryant's Oficial")
        .addSubcommand(s => s
            .setName("rank")
            .setDescription("Mira tu nivel y XP")
            .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s => s
            .setName("perfil")
            .setDescription("Muestra el perfil avanzado de un usuario")
            .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s => s
            .setName("top")
            .setDescription("Top de niveles del servidor"))
        .addSubcommand(s => s
            .setName("give-xp")
            .setDescription("Dar XP a un usuario")
            .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
            .addIntegerOption(o => o.setName("xp").setDescription("Cantidad de XP").setRequired(true).setMinValue(1)))
        .addSubcommand(s => s
            .setName("remove-xp")
            .setDescription("Remover XP a un usuario")
            .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
            .addIntegerOption(o => o.setName("xp").setDescription("Cantidad de XP").setRequired(true).setMinValue(1)))
        .addSubcommand(s => s
            .setName("channel")
            .setDescription("Configura el canal de mensajes de nivel")
            .addChannelOption(o => o.setName("canal").setDescription("Canal donde se enviarán los niveles").addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(s => s
            .setName("role")
            .setDescription("Configura un rol por nivel")
            .addIntegerOption(o => o.setName("nivel").setDescription("Nivel requerido").setRequired(true).setMinValue(1))
            .addRoleOption(o => o.setName("rol").setDescription("Rol a otorgar").setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (["give-xp", "remove-xp", "channel", "role"].includes(sub) &&
            !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Necesitas permisos de administrador para usar esta opción.", flags: 64 });
        }

        const handler = handlers[sub];
        if (!handler?.execute) {
            return interaction.reply({ content: "❌ Esa opción de niveles no está disponible.", flags: 64 });
        }

        return handler.execute(interaction);
    }
};
