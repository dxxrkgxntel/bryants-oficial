const errReply = require('../../Functions/interactionErrorReply');

const suggestSchema = require('../../Models/suggestSchema');
const suggestMessageData = require('../../Models/suggestMessage');

module.exports = {
    id: 'votono', // 🔥 customId del botón

    async execute(interaction, client) {

        try {
            const suggestData = await suggestSchema.findOne({
                guildSuggest: interaction.guild.id
            });

            const suggestMessage = await suggestMessageData.findOne({
                guildId: interaction.guild.id,
                messageId: interaction.message.id
            });

            if (!suggestMessage || !suggestData) return;

            // ❌ ya votó en NO
            if (suggestMessage.votesNo.includes(interaction.user.id)) {
                return errReply(
                    interaction,
                    "Ya votaste en NO, no puedes votar nuevamente",
                    true
                );
            }

            // 🔄 quitar voto positivo si existe
            if (suggestMessage.votesSi.includes(interaction.user.id)) {
                suggestMessage.votesSi.splice(
                    suggestMessage.votesSi.indexOf(interaction.user.id),
                    1
                );
            }

            // ➕ añadir voto negativo
            suggestMessage.votesNo.push(interaction.user.id);

            await suggestMessage.save();

            const embed = interaction.message.embeds[0];

            // 🔄 actualizar contador
            embed.data.fields[1].value = `${suggestMessage.votesSi.length}`;
            embed.data.fields[2].value = `${suggestMessage.votesNo.length}`;

            await interaction.message.edit({
                embeds: [embed]
            });

            await interaction.deferUpdate();

        } catch (error) {
            console.log(error);
        }
    }
};