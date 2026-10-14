const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const boostSchema = require("../../Models/boostSchema");
const welcomeSchema = require("../../Models/welcomeSchema");

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if (!interaction.isButton() || !interaction.guild || !interaction.member) return;

        const customId = interaction.customId;
        const configurable = customId.match(/^claim_(welcome|boost)_role_(\d{17,20})$/);
        const legacyIds = ["claim_booster", "claim_booster_vip", "claim_booster_legend"];
        if (!configurable && !legacyIds.includes(customId)) return;

        try {
            const member = interaction.member;
            let roleId;
            let boostData = null;
            if (configurable?.[1] === "welcome") {
                const config = await welcomeSchema.findOne({ Guild: interaction.guild.id }).lean();
                roleId = configurable[2];
                if (!config?.Buttons?.some(button => button.action === "role" && button.roleId === roleId)) {
                    return interaction.reply({ content: "Este botón ya no está configurado.", flags: MessageFlags.Ephemeral });
                }
            } else {
                boostData = await boostSchema.findOne({ guildId: interaction.guild.id }).lean();
                if (configurable) {
                    roleId = configurable[2];
                    if (!boostData?.boostButtons?.some(button => button.action === "role" && button.roleId === roleId)) {
                        return interaction.reply({ content: "Este botón ya no está configurado.", flags: MessageFlags.Ephemeral });
                    }
                } else {
                    if (!member.premiumSince) {
                        return interaction.reply({ content: "Debes boostear el servidor para reclamar recompensas.", flags: MessageFlags.Ephemeral });
                    }
                    if (!boostData) return interaction.reply({ content: "El sistema Booster no está configurado.", flags: MessageFlags.Ephemeral });
                    if (customId === "claim_booster") roleId = boostData.boosterRole;
                    if (customId === "claim_booster_vip") {
                        if (interaction.guild.premiumTier < 2) return interaction.reply({ content: "El servidor necesita Nivel 2.", flags: MessageFlags.Ephemeral });
                        roleId = boostData.boosterVipRole;
                    }
                    if (customId === "claim_booster_legend") {
                        if (interaction.guild.premiumTier < 3) return interaction.reply({ content: "El servidor necesita Nivel 3.", flags: MessageFlags.Ephemeral });
                        roleId = boostData.boosterLegendRole;
                    }
                }
                if (!member.premiumSince) return interaction.reply({ content: "Debes boostear el servidor para reclamar esta recompensa.", flags: MessageFlags.Ephemeral });
            }

            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) return interaction.reply({ content: "El rol configurado ya no existe.", flags: MessageFlags.Ephemeral });
            const botMember = interaction.guild.members.me;
            if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= botMember.roles.highest.position) {
                return interaction.reply({ content: "No puedo asignar ese rol. Revisa el permiso Gestionar roles y la posición del rol del bot.", flags: MessageFlags.Ephemeral });
            }
            if (member.roles.cache.has(role.id)) return interaction.reply({ content: `Ya tienes el rol ${role}.`, flags: MessageFlags.Ephemeral });

            await member.roles.add(role);
            return interaction.reply({ content: `✅ Reclamaste el rol ${role.name}.`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error("[Boost Buttons] Error al procesar un botón de rol:", error);
            const response = { content: "No pude asignarte el rol. Revisa los permisos del bot e inténtalo otra vez.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) return interaction.followUp(response).catch(() => {});
            return interaction.reply(response).catch(() => {});
        }
    }
};
