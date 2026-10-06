const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const errReply = require('../../Functions/interactionErrorReply');

const suggestSchema = require('../../Models/suggestSchema');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('sugerencia')
        .setDescription('Crea una sugerencia'),

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////////

            const suggestData =
                await suggestSchema.findOne({

                    guildSuggest:
                        interaction.guild.id
                });

            //////////////////////////////////////////////////////
            // VALIDAR SISTEMA
            //////////////////////////////////////////////////////

            if (

                !suggestData ||

                !suggestData.guildChannel

            ) {

                return errReply(

                    interaction,

                    "❌ No hay un sistema de sugerencias configurado.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // VALIDAR ENABLED
            //////////////////////////////////////////////////////

            if (!suggestData.Enabled) {

                return errReply(

                    interaction,

                    "❌ El sistema de sugerencias está desactivado.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////////

            const channel =
                interaction.guild.channels.cache.get(

                    suggestData.guildChannel
                );

            //////////////////////////////////////////////////////
            // VALIDAR CANAL
            //////////////////////////////////////////////////////

            if (!channel) {

                return errReply(

                    interaction,

                    "❌ El canal de sugerencias ya no existe.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // VALIDAR TEXTO
            //////////////////////////////////////////////////////

            if (!channel.isTextBased()) {

                return errReply(

                    interaction,

                    "❌ El canal configurado no es válido.",

                    true
                );
            }

            //////////////////////////////////////////////////////
            // MODAL
            //////////////////////////////////////////////////////

            const suggestModal =
                new ModalBuilder()

                    .setCustomId('suggestModal')

                    .setTitle('Deja tu sugerencia');

            //////////////////////////////////////////////////////
            // INPUT
            //////////////////////////////////////////////////////

            const suggestDesc =
                new TextInputBuilder()

                    .setCustomId('suggestdesc')

                    .setLabel('¿Cuál es tu sugerencia?')

                    .setStyle(
                        TextInputStyle.Paragraph
                    )

                    .setMaxLength(1000)

                    .setRequired(true);

            //////////////////////////////////////////////////////
            // ROW
            //////////////////////////////////////////////////////

            const componenteModal =
                new ActionRowBuilder()

                    .addComponents(
                        suggestDesc
                    );

            //////////////////////////////////////////////////////
            // ADD COMPONENTS
            //////////////////////////////////////////////////////

            suggestModal.addComponents(
                componenteModal
            );

            //////////////////////////////////////////////////////
            // SHOW MODAL
            //////////////////////////////////////////////////////

            await interaction.showModal(
                suggestModal
            );

        } catch (error) {

            console.log(error);

            return errReply(

                interaction,

                "❌ Ocurrió un error al abrir el sistema de sugerencias.",

                true
            );
        }
    }
};