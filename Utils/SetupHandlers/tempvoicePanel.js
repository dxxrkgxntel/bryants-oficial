const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

function createButton(customId, emoji) {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary);
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
                "Conéctate a tu sala y pulsa el icono de la función que quieras usar.\n\n" +
                "✏️ Nombre  •  👥 Límite  •  🔒 Privacidad  •  🕒 Sala de espera  •  💬 Chat\n" +
                "✅ Confiar  •  🚫 Quitar confianza  •  📞 Invitar  •  👢 Expulsar  •  🌐 Región\n" +
                "⛔ Bloquear  •  🔓 Desbloquear  •  👑 Reclamar  •  🔁 Transferir  •  🗑️ Eliminar\n\n" +
                "Las acciones de propietario solo funcionan en tu canal temporal."
            )
            .setFooter({ text: "Bryant's Oficial • TempVoice" });

        const buttons = [
            createButton("temp_rename", "✏️"),
            createButton("temp_limit", "👥"),
            createButton("temp_privacy_menu", "🔒"),
            createButton("temp_waiting", "🕒"),
            createButton("temp_chat", "💬"),

            createButton("temp_trust", "✅"),
            createButton("temp_untrust", "🚫"),
            createButton("temp_invite", "📞"),
            createButton("temp_kick", "👢"),
            createButton("temp_region", "🌐"),

            createButton("temp_block", "⛔"),
            createButton("temp_unblock_user", "🔓"),
            createButton("temp_claim", "👑"),
            createButton("temp_transfer", "🔁"),
            createButton("temp_delete", "🗑️")
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
