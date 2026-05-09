const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const welcomeSchema = require('../../Models/welcomeSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bienvenida-setup')
        .setDescription('Crea un sistema de bienvenidas al servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Canal de bienvenida')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('color')
                .setDescription('Color del embed')
                .addChoices(
                    { name: 'Rojo', value: '#FF0000' },
                    { name: 'Blanco', value: '#FFFFFF' },
                    { name: 'Negro', value: '#000000' },
                    { name: 'Morado', value: '#8A2BE2' },
                )
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('descripcion')
                .setDescription('Descripcion del mensaje')
        )

        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Imagen principal')
        )

        .addAttachmentOption(option =>
            option.setName('thumbnail')
                .setDescription('Thumbnail del embed')
        ),

    async execute(interaction) {

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo administradores pueden usar este comando",
                flags: 64
            });
        }

        const { options } = interaction;

        const channel = options.getChannel('channel');
        const color = options.getString('color');
        const description = options.getString('descripcion') || 'Pasala muy bien';

        const image = options.getAttachment('image');
        const thumbnail = options.getAttachment('thumbnail');

        // 🔥 VALIDACIÓN (IMPORTANTE)
        if (image && !image.contentType?.startsWith('image')) {
            return interaction.reply({ content: '❌ La imagen debe ser válida', flags: 64 });
        }

        if (thumbnail && !thumbnail.contentType?.startsWith('image')) {
            return interaction.reply({ content: '❌ La thumbnail debe ser una imagen', flags: 64 });
        }

        const imageURL = image?.url || null;
        const thumbnailURL = thumbnail?.url || null;

        try {
            await welcomeSchema.findOneAndUpdate(
                { Guild: interaction.guild.id },
                {
                    $set: {
                        Channel: channel.id,
                        MessageDes: description,
                        ImagenDesc: imageURL,
                        Thumbnail: thumbnailURL,
                        Color: color,
                    }
                },
                { upsert: true } // 🔥 crea si no existe
            );

            return interaction.reply({
                content: "✅ Sistema de bienvenidas configurado correctamente",
                flags: 64
            });

        } catch (error) {
            console.log(error);
            return interaction.reply({
                content: "❌ Error al guardar la configuración",
                flags: 64
            });
        }
    }
};