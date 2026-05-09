const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ImageConfig = require("../../Models/ImageConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("img-log")
        .setDescription("Configurar canal de logs")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addChannelOption(option =>
            option.setName("canal")
                .setDescription("Canal de logs")
                .setRequired(true)
        )

        // 🔥 NUEVO: THUMBNAIL
        .addAttachmentOption(option =>
            option.setName("thumbnail")
                .setDescription("Sube una thumbnail para logs")
        )

        // 🔥 NUEVO: IMAGEN
        .addAttachmentOption(option =>
            option.setName("image")
                .setDescription("Sube una imagen para logs")
        ),

    async execute(interaction) {

        const channel = interaction.options.getChannel("canal");
        const thumbnail = interaction.options.getAttachment("thumbnail");
        const image = interaction.options.getAttachment("image");

        // 🔥 VALIDACIÓN
        if (thumbnail && !thumbnail.contentType?.startsWith('image')) {
            return interaction.reply({ content: '❌ La thumbnail debe ser una imagen', flags: 64 });
        }

        if (image && !image.contentType?.startsWith('image')) {
            return interaction.reply({ content: '❌ La imagen debe ser válida', flags: 64 });
        }

        let config = await ImageConfig.findOne({
            guildId: interaction.guild.id
        });

        const thumbnailURL = thumbnail?.url || null;
        const imageURL = image?.url || null;

        if (!config) {
            config = new ImageConfig({
                guildId: interaction.guild.id,
                allowedChannels: [],
                logChannel: channel.id,
                thumbnail: thumbnailURL,
                image: imageURL
            });
        } else {
            config.logChannel = channel.id;

            // 🔥 SOLO ACTUALIZA SI SE ENVÍA
            if (thumbnailURL) config.thumbnail = thumbnailURL;
            if (imageURL) config.image = imageURL;
        }

        await config.save();

        const embed = new EmbedBuilder()
            .setColor("#8A2BE2")
            .setDescription(`📜 Canal de logs configurado: ${channel}`);

        // 🔥 APLICAR EN EMBED DE CONFIRMACIÓN
        if (thumbnailURL) embed.setThumbnail(thumbnailURL);
        if (imageURL) embed.setImage(imageURL);

        interaction.reply({ embeds: [embed], flags: 64 });
    }
};