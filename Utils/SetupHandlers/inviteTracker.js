const { PermissionFlagsBits, ChannelType } = require("discord.js");
const logsSchema = require("../../Models/logsSchema");

module.exports = {
    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo los administradores pueden configurar el Invite Tracker.",
                flags: 64
            });
        }

        const channel = interaction.options.getChannel("canal", true);
        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: "❌ Selecciona un canal de texto válido.",
                flags: 64
            });
        }

        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
        ])) {
            return interaction.reply({
                content: "❌ Necesito los permisos Ver canal y Enviar mensajes en ese canal.",
                flags: 64
            });
        }

        try {
            let config = await logsSchema.findOne({ Guild: interaction.guild.id });
            if (!config) {
                config = await logsSchema.create({
                    Guild: interaction.guild.id,
                    InviteTrackerChannel: channel.id,
                    Enabled: true
                });
            } else {
                config.InviteTrackerChannel = channel.id;
                await config.save();
            }

            return interaction.reply({
                content: `✅ Invite Tracker configurado correctamente. Los registros de invitaciones se enviarán en ${channel}.\n\nRecuerda que necesito el permiso **Gestionar servidor** para identificar quién invitó a cada miembro.`,
                flags: 64
            });
        } catch (error) {
            console.error("[INVITE TRACKER] Error al guardar la configuración:", error);
            return interaction.reply({
                content: "❌ No se pudo guardar la configuración del Invite Tracker. Inténtalo de nuevo.",
                flags: 64
            });
        }
    }
};
