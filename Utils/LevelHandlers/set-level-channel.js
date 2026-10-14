const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const LevelConfig = require("../../Models/LevelConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("level-setup")
        .setDescription("Configura el canal y los avisos del sistema de niveles")
        .addChannelOption(option => option
            .setName("canal")
            .setDescription("Canal donde se enviarán los avisos de nivel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(option => option.setName("titulo").setDescription("Título del aviso al subir de nivel").setMaxLength(256))
        .addStringOption(option => option.setName("descripcion").setDescription("Variables: {usuario}, {servidor}, {nivel}, {xp}, {recompensa}").setMaxLength(4000))
        .addStringOption(option => option.setName("titulo_rol").setDescription("Título del aviso al recibir un rol").setMaxLength(256))
        .addStringOption(option => option.setName("descripcion_rol").setDescription("Variables: {usuario}, {servidor}, {nivel}, {rol}").setMaxLength(4000))
        .addStringOption(option => option.setName("banner").setDescription("URL de imagen del aviso").setMaxLength(300))
        .addStringOption(option => option.setName("miniatura").setDescription("URL de miniatura del aviso").setMaxLength(300))
        .addStringOption(option => option.setName("color").setDescription("Color hexadecimal #RRGGBB").setMaxLength(7))
        .addIntegerOption(option => option.setName("monedas").setDescription("Monedas por nivel multiplicadas por el nivel alcanzado").setMinValue(0).setMaxValue(1000000))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel("canal");
        if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: "Debes seleccionar un canal de texto válido.", flags: 64 });
        }

        const options = interaction.options;
        const update = { levelChannel: channel.id };
        const optionalFields = {
            levelUpTitle: options.getString("titulo"),
            levelUpDescription: options.getString("descripcion"),
            levelRoleTitle: options.getString("titulo_rol"),
            levelRoleDescription: options.getString("descripcion_rol"),
            levelImage: options.getString("banner"),
            levelThumbnail: options.getString("miniatura"),
            levelColor: options.getString("color"),
            levelCoinReward: options.getInteger("monedas")
        };
        for (const [key, value] of Object.entries(optionalFields)) if (value !== null) update[key] = value;
        for (const key of ["levelImage", "levelThumbnail"]) {
            if (update[key] && !/^https?:\/\//i.test(update[key])) {
                return interaction.reply({ content: "Las imágenes deben usar una URL http:// o https:// válida.", flags: 64 });
            }
        }
        if (update.levelColor && !/^#[\da-f]{6}$/i.test(update.levelColor)) {
            return interaction.reply({ content: "El color debe tener formato hexadecimal #RRGGBB.", flags: 64 });
        }

        await LevelConfig.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { $set: update },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return interaction.reply({
            embeds: [{ title: "Configuración de niveles guardada", description: `Canal de avisos: ${channel}` }],
            flags: 64
        });
    }
};
