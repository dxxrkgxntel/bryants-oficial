const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const verifySchema = require('../../Models/verificationSchema');

module.exports = {
    id: 'verifybutton', // 🔥 customId del botón

    async execute(interaction, client) {

        try {
            const verifyData = await verifySchema.findOne({
                guildId: interaction.guild.id
            });

            if (!verifyData) {
                return errReply(interaction, "No se ha encontrado la data", true);
            }

            const role = interaction.guild.roles.cache.get(verifyData.roleId);

            if (!role) {
                return errReply(interaction, "No se encontró el rol de verificación", true);
            }

            await interaction.member.roles.add(role);

            return correReply(interaction, "Se otorgó correctamente el rol", true);

        } catch (error) {
            console.log(error);
            return errReply(interaction, "Ocurrió un error al verificar", true);
        }
    }
};