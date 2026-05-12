const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChatInputCommandInteraction } = require('discord.js')
const errReply = require('../../Functions/interactionErrorReply')
const correReply = require('../../Functions/interactionReply')
const userReply = require('../../Functions/interactionUserReply')
const botReply = require('../../Functions/interactionBotReply')
const suggestSchema = require('../../Models/suggestSchema')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('accion-sugerencias')
        .setDescription('Elige las acciones de tu sistema de aplicaciones')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('boolean')
                .setDescription('Deseas ACTIVAR o DESACTIVAR las aplicaciones')
                .setRequired(true),
        ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        try {
            const data = await suggestSchema.findOne({guildSuggest:interaction.guild.id})
            if(!data) return errReply(interaction,"Todavia no se ha creado el sistema de sugerencias",true);
            const {options} = interaction
            let action = await options.getBoolean('boolean')
            data.Enabled = action

            await data.save()

            return correReply(
                interaction,
                action
                    ? 'Se activaron nuevamente las sugerencias'
                    : 'Las sugerencias fueron desactivadas',
                true
            )

        } catch (error) {
            console.log(error);
            return errReply(interaction,'Acaba de ocurrir un error al actualizar el sistema de sugerencias',true)
        }
    }
};

