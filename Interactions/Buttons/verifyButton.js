const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

const verifySchema = require('../../Models/verificationSchema');

module.exports = {

    id: 'verifybutton',

    async execute(interaction, client) {

        try {

            const verifyData = await verifySchema.findOne({

                guildId: interaction.guild.id
            });

            // ❌ NO DATA
            if (!verifyData) {

                return errReply(

                    interaction,

                    "No se ha encontrado la data",

                    true
                );
            }

            // ✅ ROL QUE SE AÑADE
            const addRole = interaction.guild.roles.cache.get(

                verifyData.roleId
            );

            // ❌ ROL QUE SE REMUEVE
            const removeRole = interaction.guild.roles.cache.get(

                verifyData.removeRoleId
            );

            // ❌ NO EXISTE ROL
            if (!addRole) {

                return errReply(

                    interaction,

                    "No se encontró el rol de verificación",

                    true
                );
            }

            // 🔒 YA VERIFICADO
            if (interaction.member.roles.cache.has(addRole.id)) {

                return errReply(

                    interaction,

                    "Ya estás verificado",

                    true
                );
            }

            // ✅ AÑADIR ROL
            await interaction.member.roles.add(addRole);

            // ❌ REMOVER ROL
            if (removeRole) {

                await interaction.member.roles.remove(removeRole);
            }

            // ✅ RESPUESTA
            return correReply(

                interaction,

                "Te verificaste correctamente",

                true
            );

        } catch (error) {

            console.log(error);

            return errReply(

                interaction,

                "Ocurrió un error al verificar",

                true
            );
        }
    }
};