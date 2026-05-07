const { EmbedBuilder } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

const errReply = require('../../Functions/interactionErrorReply');

const ticketSchema = require('../../Models/ticketGuildSchema');
const ticketSoporte = require('../../Models/ticketBuySchema');

module.exports = {
    id: 'closecompras', // 🔥 customId del botón

    async execute(interaction, client) {

        try {
            const ticketData = await ticketSchema.findOne({
                guildId: interaction.guild.id
            });

            if (!ticketData) {
                return errReply(interaction, "No se ha creado el sistema de tickets", true);
            }

            if (!interaction.member.roles.cache.has(ticketData.handlerRol)) {
                return errReply(interaction, "No tienes permisos para hacer esto", true);
            }

            const data = await ticketSoporte.findOne({
                guildId: interaction.guild.id,
                channelId: interaction.channel.id
            });

            if (!data) {
                return errReply(
                    interaction,
                    "Este canal fue eliminado de la base de datos, puedes eliminar el canal manualmente",
                    false
                );
            }

            const channelLogs = interaction.guild.channels.cache.get(ticketData.channelLogs);

            if (!channelLogs) {
                return errReply(interaction, "No se encontró el canal de logs", true);
            }

            const transcript = await createTranscript(interaction.channel, {
                limit: -1,
                filename: `${interaction.user.username}.html`
            });

            const embed = new EmbedBuilder()
                .setDescription('Se cerró el ticket');

            await channelLogs.send({
                embeds: [embed],
                files: [transcript]
            });

            await ticketSoporte.findOneAndDelete({
                guildId: interaction.guild.id,
                channelId: interaction.channel.id
            });

            await interaction.channel.delete();

        } catch (error) {
            console.log(error);
        }
    }
};