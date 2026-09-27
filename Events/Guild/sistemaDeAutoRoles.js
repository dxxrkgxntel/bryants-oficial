const autoRoleSystem =
    require('../../Models/autoRoleType');

module.exports = {

    name: 'guildMemberAdd',

    async execute(member) {

        try {

            //////////////////////////////////////////////////
            // GUILD
            //////////////////////////////////////////////////

            const guild =
                member.guild;

            //////////////////////////////////////////////////
            // BUSCAR DATA
            //////////////////////////////////////////////////

            const autoRoleData =
                await autoRoleSystem.findOne({

                    guildId:
                        guild.id

                }).lean();

            //////////////////////////////////////////////////

            if (!autoRoleData) return;

            //////////////////////////////////////////////////
            // ROLES
            //////////////////////////////////////////////////

            const userRole =
                guild.roles.cache.get(
                    autoRoleData.userRole
                );

            //////////////////////////////////////////////////

            const botRole =
                guild.roles.cache.get(
                    autoRoleData.botRole
                );

            //////////////////////////////////////////////////
            // ROL OBJETIVO
            //////////////////////////////////////////////////

            const targetRole =
                member.user.bot
                    ? botRole
                    : userRole;

            //////////////////////////////////////////////////
            // VALIDAR ROL
            //////////////////////////////////////////////////

            if (!targetRole) {

                return console.log(

                    `❌ [AUTOROLE] Rol no encontrado en ${guild.name}`
                );
            }

            //////////////////////////////////////////////////
            // BOT MEMBER
            //////////////////////////////////////////////////

            const botMember =
                guild.members.me;

            //////////////////////////////////////////////////

            if (!botMember) {

                return console.log(

                    `❌ [AUTOROLE] No se encontró el bot member en ${guild.name}`
                );
            }

            //////////////////////////////////////////////////
            // PERMISOS
            //////////////////////////////////////////////////

            if (

                !botMember.permissions.has(
                    'ManageRoles'
                )

            ) {

                return console.log(

                    `❌ [AUTOROLE] El bot no tiene ManageRoles en ${guild.name}`
                );
            }

            //////////////////////////////////////////////////
            // JERARQUIA
            //////////////////////////////////////////////////

            if (

                targetRole.position >=
                botMember.roles.highest.position

            ) {

                return console.log(

                    `❌ [AUTOROLE] El rol está por encima del bot en ${guild.name}`
                );
            }

            //////////////////////////////////////////////////
            // YA TIENE EL ROL
            //////////////////////////////////////////////////

            if (
                member.roles.cache.has(
                    targetRole.id
                )
            ) return;

            //////////////////////////////////////////////////
            // AÑADIR ROL
            //////////////////////////////////////////////////

            await member.roles.add(

                targetRole,

                'Sistema de Autoroles'
            );

            //////////////////////////////////////////////////

            console.log(

                `✅ [AUTOROLE] Rol añadido a ${member.user.tag} en ${guild.name}`
            );

        } catch (error) {

            console.log(

                '❌ Error en sistemaDeAutoRoles:',
                error
            );
        }
    }
};