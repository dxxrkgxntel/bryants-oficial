const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const CommunityPanel = require("../../Models/CommunityPanel");
const { recordSelfRoleSelection } = require("../../Functions/selfRoleAchievementMetrics");
const { recordVerifiedMember } = require("../../Functions/verificationAchievementMetrics");

function canAssignRole(guild, role) {
    const botMember = guild.members.me;
    return Boolean(
        role &&
        role.id !== guild.id &&
        !role.managed &&
        botMember?.permissions.has(PermissionFlagsBits.ManageRoles) &&
        role.position < botMember.roles.highest.position
    );
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if ((!interaction.isButton() && !interaction.isStringSelectMenu()) || !interaction.guild) return;
        const match = interaction.customId.match(/^community-panel:([a-z0-9_-]{1,40}):(verify|roles|role):(\d{17,20})?$/i);
        if (!match) return;

        try {
            const [, panelId, action, singleRoleId] = match;
            const panel = await CommunityPanel.findOne({
                guildId: interaction.guild.id,
                panelId: panelId.toLowerCase(),
                enabled: true
            }).lean();
            if (!panel) {
                return interaction.reply({ content: "Este panel ya no está activo o fue eliminado.", flags: MessageFlags.Ephemeral });
            }

            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (action === "verify") {
                if (panel.kind !== "verification" || !panel.verificationRoleId) {
                    return interaction.reply({ content: "La configuración de verificación no es válida.", flags: MessageFlags.Ephemeral });
                }
                const role = interaction.guild.roles.cache.get(panel.verificationRoleId);
                if (!canAssignRole(interaction.guild, role)) {
                    return interaction.reply({ content: "No puedo asignar el rol de verificación. Revisa Gestionar roles y la jerarquía.", flags: MessageFlags.Ephemeral });
                }
                if (member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: "Tu cuenta ya tiene el rol de verificación.", flags: MessageFlags.Ephemeral });
                }
                const removeRoles = (panel.removeRoleIds || []).filter(id => id !== role.id).map(id => interaction.guild.roles.cache.get(id)).filter(item => canAssignRole(interaction.guild, item));
                await member.roles.add(role, "Verificación completada desde el panel configurado");
                if (removeRoles.length) await member.roles.remove(removeRoles, "Retirar roles previos tras verificar");
                await recordVerifiedMember(interaction.guild, interaction.user, panel.panelId)
                    .catch(error => console.warn("[Community Panels] No se pudo sincronizar verified:", error.message));
                return interaction.reply({ content: "✅ Verificación completada correctamente.", flags: MessageFlags.Ephemeral });
            }

            if (panel.kind !== "self_roles") {
                return interaction.reply({ content: "Este panel no permite reclamar roles.", flags: MessageFlags.Ephemeral });
            }
            const configuredRoles = new Map((panel.roles || []).map(item => [item.roleId, item]));
            const requestedIds = action === "role" ? [singleRoleId] : interaction.values;
            if (!Array.isArray(requestedIds) || !requestedIds.length || requestedIds.some(id => !configuredRoles.has(id))) {
                return interaction.reply({ content: "La selección contiene un rol que no pertenece a este panel.", flags: MessageFlags.Ephemeral });
            }

            const roles = requestedIds.map(id => interaction.guild.roles.cache.get(id));
            if (roles.some(role => !canAssignRole(interaction.guild, role))) {
                return interaction.reply({ content: "No puedo asignar uno de los roles seleccionados. Revisa los permisos y la jerarquía del bot.", flags: MessageFlags.Ephemeral });
            }
            const missingRoles = roles.filter(role => !member.roles.cache.has(role.id));
            if (!missingRoles.length) {
                return interaction.reply({ content: "Ya tienes todos los roles seleccionados.", flags: MessageFlags.Ephemeral });
            }

            await member.roles.add(missingRoles, "Rol voluntario reclamado desde un panel de Bryvex Bot");
            for (const role of missingRoles) {
                await recordSelfRoleSelection(interaction.guild, interaction.user, role.id)
                    .catch(error => console.warn("[Community Panels] No se pudo sincronizar self_roles_taken:", error.message));
            }
            return interaction.reply({
                content: `✅ Roles reclamados: ${missingRoles.map(role => role.name).join(", ")}.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error("[Community Panels] Error procesando una interacción:", error);
            const response = { content: "No pude completar la acción. Revisa los permisos del bot e inténtalo otra vez.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) return interaction.followUp(response).catch(() => {});
            return interaction.reply(response).catch(() => {});
        }
    }
};
