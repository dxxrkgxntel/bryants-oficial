const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const leaveSchema = require('../../Models/leaveSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salida-setup')
        .setDescription('Crea un sistema de salidas del servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Canal de salidas')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('descripcion')
                .setDescription('Descripcion del mensaje')
        )

        // 🔥 IMAGEN PRINCIPAL (UPLOAD)
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Imagen del embed')
        )

        // 🔥 NUEVO: THUMBNAIL (UPLOAD)
        .addAttachmentOption(option =>
            option.setName('thumbnail')
                .setDescription('Thumbnail del embed')
        ),

    async execute(interaction) {

        const { options } = interaction;

        const channel = options.getChannel('channel');
        const description = options.getString('descripcion') || ' ';
        const image = options.getAttachment('image');
        const thumbnail = options.getAttachment('thumbnail');

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "No tengo permisos para esto", ephemeral: true });
        }

        // 🔥 VALIDACIÓN
        if (image && !image.contentType?.startsWith('image')) {
            return interaction.reply({ content: '❌ La imagen debe ser válida', ephemeral: true });
        }

        if (thumbnail && !thumbnail.contentType?.startsWith('image')) {
            return interaction.reply({ content: '❌ La thumbnail debe ser una imagen', ephemeral: true });
        }

        const imageURL = image?.url || null;
        const thumbnailURL = thumbnail?.url || null;

        try {

            await leaveSchema.findOneAndUpdate(
                { Guild: interaction.guild.id },
                {
                    $set: {
                        Channel: channel.id,
                        MessageDes: description,
                        ImagenDesc: imageURL,
                        Thumbnail: thumbnailURL // 🔥 NUEVO
                    }
                },
                { upsert: true }
            );

            return interaction.reply({
                content: "✅ Sistema de salidas configurado correctamente",
                ephemeral: true
            });

        } catch (error) {
            console.log(error);
            return interaction.reply({
                content: "❌ Error al guardar la configuración",
                ephemeral: true
            });
        }
    }
};