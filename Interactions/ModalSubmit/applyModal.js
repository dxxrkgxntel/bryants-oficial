const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const applySchema = require('../../Models/applyGuildSchema');
const userApplySchema = require('../../Models/applyUserSchema');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

module.exports = {
    id: 'developerModal', // 🔥 customId del modal

    async execute(interaction, client) {

        try {
            const applyGuild = await applySchema.findOne({
                applyGuildId: interaction.guild.id
            });

            const channelLogs = client.channels.cache.get(applyGuild.applyChannelLogs);

            if (!channelLogs) {
                console.log('No se encontró el canal de logs');
                return;
            }

            const userName = interaction.fields.getTextInputValue('username');
            const userAge = interaction.fields.getTextInputValue('userage');
            const userPortfolio = interaction.fields.getTextInputValue('userportfolio');
            const userDescription = interaction.fields.getTextInputValue('userdescription');

            const embedApply = new EmbedBuilder()
                .setAuthor({
                    name: 'Nueva Aplicacion para staff',
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setDescription(
                    `**Informacion del usuario**\n\n` +
                    `> Member Tag: <@${interaction.user.id}>\n` +
                    `> Miembro desde: <t:${parseInt(interaction.member.joinedTimestamp / 1000)}:R>\n` +
                    `> Id del miembro: ${interaction.user.id}\n` +
                    `> Cuenta creada: <t:${parseInt(interaction.user.createdTimestamp / 1000)}:R>\n`
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Nombre del usuario', value: `\`\`\`${userName}\`\`\``, inline: true },
                    { name: 'Edad del usuario', value: `\`\`\`${userAge}\`\`\``, inline: true },
                    { name: 'Portafolio del usuario', value: `\`\`\`${userPortfolio}\`\`\``, inline: true },
                    { name: 'Descripcion del usuario', value: `\`\`\`${userDescription}\`\`\``, inline: true },
                    { name: 'Estado', value: `Pendiente`, inline: true }
                )
                .setFooter({
                    text: `${interaction.guild.name}`,
                    iconURL: client.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // 🔘 BOTONES
            const buttonsActions = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Aceptar')
                    .setCustomId('applyacept')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setLabel('Denegar')
                    .setCustomId('applydeny')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑')
            );

            const envioDelMensaje = await channelLogs.send({
                embeds: [embedApply],
                components: [buttonsActions]
            });

            await userApplySchema.create({
                applyGuildId: interaction.guild.id,
                applyUserId: interaction.user.id,
                applyMessageId: envioDelMensaje.id
            });

            correReply(interaction, 'Se envió correctamente tu aplicación', true);

        } catch (error) {
            console.log(error);
            return errReply(interaction, 'Se produjo un error al enviar tu solicitud', true);
        }
    }
};