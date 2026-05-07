const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');

const applyGuildSchema = require('../../Models/applyGuildSchema');
const applyUserSchema = require('../../Models/applyUserSchema');

module.exports = {
    id: 'apply', // 🔥 IMPORTANTE (antes era customId)

    async execute(interaction, client) {

        try {
            const applyGuildData = await applyGuildSchema.findOne({
                applyGuildId: interaction.guild.id
            });

            const role = interaction.guild.roles.cache.get(applyGuildData.applyRole);

            if (!role) {
                return errReply(
                    interaction,
                    'El servidor no tiene configurado un rol para darte',
                    true
                );
            }

            const userAplicacion = await applyUserSchema.findOne({
                applyGuildId: interaction.guild.id,
                applyUserId: interaction.user.id
            });

            if (userAplicacion) {
                return errReply(
                    interaction,
                    'Tienes una aplicacion creada, porfavor espera que los moderadores las revisen',
                    true
                );
            }

            if (interaction.member.roles.cache.has(role.id)) {
                return errReply(
                    interaction,
                    'Tu ya tienes el rol de developer',
                    true
                );
            }

            const aplication = new ModalBuilder()
                .setCustomId('developerModal')
                .setTitle('Aplicacion para Staff');

            const userName = new TextInputBuilder()
                .setCustomId('username')
                .setLabel('Escribe tu nombre')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const userAge = new TextInputBuilder()
                .setCustomId('userage')
                .setLabel('Escribe tu edad')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const userPortfolio = new TextInputBuilder()
                .setCustomId('userportfolio')
                .setLabel('Ingresa el link de tu github')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const userDescription = new TextInputBuilder()
                .setCustomId('userdescription')
                .setLabel('En que aportarias al servidor')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(50);

            const userApplyName = new ActionRowBuilder().addComponents(userName);
            const userApplyAge = new ActionRowBuilder().addComponents(userAge);
            const userApplyPortfolio = new ActionRowBuilder().addComponents(userPortfolio);
            const userApplyDescription = new ActionRowBuilder().addComponents(userDescription);

            aplication.addComponents(
                userApplyName,
                userApplyAge,
                userApplyPortfolio,
                userApplyDescription
            );

            await interaction.showModal(aplication);

        } catch (error) {
            console.log(error);
            return errReply(
                interaction,
                'Se produjo un error al tratar de crear la aplicacion',
                true
            );
        }
    }
};