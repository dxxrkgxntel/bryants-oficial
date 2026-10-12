const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

function createButton(customId, label, emoji, style = ButtonStyle.Secondary) {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setEmoji(emoji)
        .setStyle(style);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tempvoice-panel")
        .setDescription("Envía el panel global de TempVoice")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo los administradores pueden enviar el panel TempVoice.",
                flags: MessageFlags.Ephemeral
            });
        }

        const permissions = interaction.channel?.permissionsFor(interaction.guild.members.me);
        if (!permissions?.has([
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ViewChannel
        ])) {
            return interaction.reply({
                content: "❌ No tengo permisos suficientes en este canal.",
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor("#8A2BE2")
            .setTitle("🎛️ | PANEL DE VOZ")
            .setDescription(
                "Esta interfaz te permite administrar tu canal de voz temporal.\n" +
                "Conéctate a tu sala y utiliza los botones para cambiar sus opciones.\n\n" +
                "👥 **Sala:** límite y privacidad\n" +
                "🔐 **Acceso:** permitir, quitar acceso, invitar y bloquear usuarios\n" +
                "⚙️ **Opciones:** sala de espera, chat, región y nombre\n\n" +
                "Las acciones de propietario solo funcionan en tu canal temporal."
            )
            .setFooter({ text: "Bryant's Oficial • TempVoice" });

        const buttons = [
            createButton("temp_rename", "NOMBRE", "✏️"),
            createButton("temp_limit", "LÍMITE", "👥"),
            createButton("temp_privacy_menu", "PRIVACIDAD", "🔒"),
            createButton("temp_waiting", "SALA DE ESPERA", "🕒"),
            createButton("temp_chat", "CHAT", "💬"),

            createButton("temp_trust", "CONFIAR", "✅"),
            createButton("temp_untrust", "QUITAR CONFIANZA", "🚫"),
            createButton("temp_invite", "INVITAR", "📞"),
            createButton("temp_kick", "EXPULSAR", "👢"),
            createButton("temp_region", "REGIÓN", "🌐"),

            createButton("temp_block", "BLOQUEAR", "⛔"),
            createButton("temp_unblock_user", "DESBLOQUEAR", "🔓"),
            createButton("temp_claim", "RECLAMAR", "👑"),
            createButton("temp_transfer", "TRANSFERIR", "🔁"),
            createButton("temp_delete", "ELIMINAR SALA", "🗑️", ButtonStyle.Danger)
        ];

        const rows = [];
        for (let index = 0; index < buttons.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(index, index + 5)));
        }

        try {
            await interaction.channel.send({
                embeds: [embed],
                components: rows
            });
            return interaction.reply({
                content: "✅ Panel TempVoice enviado correctamente.",
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error("[TempVoice Panel] Error al enviar el panel:", error);
            return interaction.reply({
                content: "❌ No pude enviar el panel TempVoice.",
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
