const reactionRolesSchema =
    require("../../Models/reactionRolesSchema");

module.exports = {

    //////////////////////////////////////////////////
    // REGEX
    //////////////////////////////////////////////////

    id: /^rr_\d+$/,

    //////////////////////////////////////////////////

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // BUSCAR PANEL
            //////////////////////////////////////////////////

            const data =
                await reactionRolesSchema.findOne({

                    customId:
                        interaction.customId
                });

            //////////////////////////////////////////////////

            if (!data) {

                return interaction.reply({

                    content:
                        "❌ Este panel ya no existe.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // MEMBER
            //////////////////////////////////////////////////

            const member =
                interaction.member;

            //////////////////////////////////////////////////
            // TODOS LOS ROLES DEL PANEL
            //////////////////////////////////////////////////

            const allRoles =

                data.roles.map(r => r.roleId);

            //////////////////////////////////////////////////
            // REMOVER ROLES ANTERIORES
            //////////////////////////////////////////////////

            await member.roles.remove(
                allRoles
            ).catch(() => {});

            //////////////////////////////////////////////////
            // AÑADIR NUEVOS
            //////////////////////////////////////////////////

            for (const roleId of interaction.values) {

                await member.roles.add(
                    roleId
                ).catch(() => {});
            }

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    "✅ Tus roles fueron actualizados.",

                flags: 64
            });

        } catch (error) {

            console.log(
                "❌ Error RR Menu:",
                error
            );
        }
    }
};