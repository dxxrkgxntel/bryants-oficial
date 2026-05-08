const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ChatInputCommandInteraction } = require('discord.js')

const errReply = require('../../Functions/interactionErrorReply')
const correReply = require('../../Functions/interactionReply')

const countingSchema = require('../../Models/countingSchema')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('contador-setup')
        .setDescription('Crea un sistema de conteo para tu servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Elige el canal donde se hara el sistema de conteo')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const { options } = interaction
        const channel = options.getChannel('channel')
        try {
            const countingData = await countingSchema.findOne({ guildId: interaction.guild.id })
            if (!countingData) {
                await countingSchema.create({
                    guildId: interaction.guild.id,
                    channelId: channel.id
                })
                return correReply(interaction, "Se creo correctamente el sistema de conteo", true)
            }
            if (countingData) {
                await countingSchema.findOneAndUpdate({
                    guildId: interaction.guild.id,
                    channelId: channel.id
                })
                return correReply(interaction, "Se modifico correctamente el sistema de conteo", true)
            }
        } catch (error) {
            console.log(error);
            return errReply(interaction, "Ocurrio un error al tratar de crear el sistema de conteo", true)
        }

    }
};
