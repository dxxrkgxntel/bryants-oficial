const {
    ChannelType,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const VoiceConnectConfig = require("../../Models/VoiceConnectConfig");
const { connectToVoiceChannel } = require("../../Handlers/voiceConnectionManager");

module.exports = {
    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo los administradores pueden conectar el bot a voz.",
                flags: MessageFlags.Ephemeral
            });
        }

        const channel = interaction.options.getChannel("canal");
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return interaction.reply({
                content: "❌ Selecciona un canal de voz normal del servidor.",
                flags: MessageFlags.Ephemeral
            });
        }

        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])) {
            return interaction.reply({
                content: "❌ Necesito permisos para ver y conectar al bot a ese canal.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await VoiceConnectConfig.findOneAndUpdate(
                { guildId: interaction.guildId },
                { $set: { channelId: channel.id, updatedBy: interaction.user.id } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            await connectToVoiceChannel(interaction.guild, channel.id);
            return interaction.editReply(
                `✅ Me conecté a ${channel} con el micrófono silenciado y sin ensordecerme. Volveré a conectarme allí cuando el bot se reinicie.`
            );
        } catch (error) {
            console.error("[Voice Connect Setup] Error al conectar:", error);
            return interaction.editReply(
                `⚠️ Guardé ${channel} como canal de conexión, pero no pude conectarme ahora. Revisaré la reconexión cuando el bot vuelva a iniciar; comprueba mis permisos y que el canal siga disponible.`
            );
        }
    }
};
