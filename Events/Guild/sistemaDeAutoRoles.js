const autoRoleSystem = require('../../Models/autoRoleType');

module.exports = {
    name: 'guildMemberAdd',

    async execute(member, client) {

        const { guild } = member;

        try {

            // 🔍 Buscar configuración
            const autoRoleData = await autoRoleSystem.findOne({
                guildId: guild.id
            });

            if (!autoRoleData) return;

            // 🔥 Obtener roles correctamente
            const userRole = guild.roles.cache.get(autoRoleData.userRole);
            const botRole = guild.roles.cache.get(autoRoleData.botRole);

            // 🔒 Rol objetivo
            const targetRole = member.user.bot ? botRole : userRole;

            // ❌ Si no existe
            if (!targetRole) {
                return console.log('❌ El rol configurado no existe');
            }

            // 🔒 Verificar jerarquía
            const botMember = guild.members.me;

            if (!botMember) {
                return console.log('❌ No se encontró el miembro del bot');
            }

            if (targetRole.position >= botMember.roles.highest.position) {
                return console.log('❌ El rol está por encima del bot');
            }

            // ✅ Añadir rol
            await member.roles.add(targetRole);

            console.log(`✅ Rol añadido a ${member.user.tag}`);

        } catch (error) {
            console.log('❌ Error en sistemaDeAutoRoles:', error);
        }
    }
};