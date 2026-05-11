const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    Client,
    ChatInputCommandInteraction,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const autoRole = require('../../Models/verificationSchema');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('verificacion-setup')
        .setDescription('Crea un sistema de verificacion para tu servidor')

        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // ✅ ROL QUE RECIBE
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Rol que recibirá el usuario')
                .setRequired(true)
        )

        // ❌ ROL QUE SE REMOVERÁ
        .addRoleOption(option =>
            option.setName('remove_role')
                .setDescription('Rol que se removerá al verificar')
                .setRequired(true)
        )

        // 📝 DESCRIPCIÓN
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Mensaje del embed')
                .setRequired(true)
        )

        // 📍 CANAL
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Elige el canal')
                .addChannelTypes(ChannelType.GuildText)
        )

        // 🖼️ THUMBNAIL
        .addAttachmentOption(option =>
            option.setName('thumbnail')
                .setDescription('Sube una thumbnail')
        )

        // 📸 IMAGE
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Sube una imagen grande')
        )

        // 📌 FOOTER
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Texto del footer')
        ),

    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */

    async execute(interaction, client) {

        // 🔒 SOLO ADMIN
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {

            return interaction.reply({

                content: "❌ Solo administradores pueden usar este comando",

                flags: 64
            });
        }

        // 🔘 BOTÓN
        const button = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId('verifybutton')

                    .setEmoji('✅')

                    .setStyle(ButtonStyle.Secondary)
            );

        const { options } = interaction;

        // ✅ ROL AÑADIR
        const rol = options.getRole('role');

        // ❌ ROL REMOVER
        const removeRole = options.getRole('remove_role');

        // 📝 DESCRIPCIÓN
        const description = options.getString('description');

        // 📍 CANAL
        const channel = options.getChannel('channel') || interaction.channel;

        // 🖼️ THUMBNAIL
        const thumbnail = options.getAttachment('thumbnail');

        // 📸 IMAGE
        const image = options.getAttachment('image');

        // 📌 FOOTER
        const footer = options.getString('footer');

        // 📦 EMBED
        const embed = new EmbedBuilder()

            .setTitle('Verificate')

            .setDescription(description)

            .setColor('#8A2BE2');

        // 🖼️ THUMBNAIL
        if (thumbnail) {
            embed.setThumbnail(thumbnail.url);
        }

        // 📸 IMAGE
        if (image) {
            embed.setImage(image.url);
        }

        // 📌 FOOTER
        if (footer) {
            embed.setFooter({
                text: footer
            });
        }

        try {

            const autoRolData = await autoRole.findOne({

                guildId: interaction.guild.id
            });

            // 💾 DATA
            const payload = {

                guildId: interaction.guild.id,

                channelId: channel.id,

                roleId: rol.id,

                removeRoleId: removeRole.id
            };

            // 🚀 ENVIAR EMBED
            await channel.send({

                embeds: [embed],

                components: [button]
            });

            // ❌ SI NO EXISTE
            if (!autoRolData) {

                await autoRole.create(payload);

                return correReply(

                    interaction,

                    "Sistema de verificación creado correctamente",

                    true
                );
            }

            // ✅ ACTUALIZAR
            await autoRole.findOneAndUpdate(

                { guildId: interaction.guild.id },

                payload
            );

            return correReply(

                interaction,

                "Sistema actualizado correctamente",

                true
            );

        } catch (error) {

            console.log(error);

            return errReply(

                interaction,

                "Error al crear el sistema de verificación",

                true
            );
        }
    }
};