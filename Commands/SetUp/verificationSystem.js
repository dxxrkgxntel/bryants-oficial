const { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const errReply = require('../../Functions/interactionErrorReply')
const correReply = require('../../Functions/interactionReply')
const autoRole = require('../../Models/verificationSchema')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify-setup')
        .setDescription('Crea un sistema de verificacion para tu servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Elige el rol para el usuario')
                .setRequired(true)
        )

        .addStringOption(option =>
            option.setName('description')
                .setDescription('Mensaje del embed')
                .setRequired(true)
        )

        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Elige el canal')
                .addChannelTypes(ChannelType.GuildText)
        )

        // 🔥 AHORA SON ARCHIVOS (UPLOAD)
        .addAttachmentOption(option =>
            option.setName('thumbnail')
                .setDescription('Sube una thumbnail')
        )

        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Sube una imagen grande')
        )

        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Texto del footer')
        ),

    async execute(interaction, client) {

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo administradores pueden usar este comando",
                ephemeral: true
            });
        }

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verifybutton')
                .setEmoji('🛵')
                .setStyle(ButtonStyle.Primary)
        )

        const { options } = interaction
        const rol = options.getRole('role')
        const description = options.getString('description')
        const channel = options.getChannel('channel') || interaction.channel

        // 🔥 ARCHIVOS
        const thumbnail = options.getAttachment('thumbnail')
        const image = options.getAttachment('image')
        const footer = options.getString('footer')

        const embed = new EmbedBuilder()
            .setTitle('Verificate')
            .setDescription(description)
            .setColor('Purple')

        // 🔥 USAR URL DEL ARCHIVO
        if (thumbnail) embed.setThumbnail(thumbnail.url)
        if (image) embed.setImage(image.url)
        if (footer) embed.setFooter({ text: footer })

        try {
            const autoRolData = await autoRole.findOne({ guildId: interaction.guild.id })

            await channel.send({ embeds: [embed], components: [button] })

            if (!autoRolData) {
                await autoRole.create({
                    guildId: interaction.guild.id,
                    channelId: channel.id,
                    roleId: rol.id,
                })

                return correReply(interaction, "Sistema de verificación creado correctamente", true)
            }

            await autoRole.findOneAndUpdate(
                { guildId: interaction.guild.id },
                {
                    channelId: channel.id,
                    roleId: rol.id,
                }
            )

            return correReply(interaction, "Sistema actualizado correctamente", true)

        } catch (error) {
            console.log(error);
            return errReply(interaction, "Error al crear el sistema de verificación", true)
        }
    }
};