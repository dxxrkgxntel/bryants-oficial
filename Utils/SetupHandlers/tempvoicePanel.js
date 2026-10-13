const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const path = require("path");

function findCustomEmoji(guild, emojiName) {
    return guild.emojis.cache.find(emoji => emoji.name === emojiName) ?? null;
}

function createButton(guild, customId, emojiName, fallbackEmoji) {
    const customEmoji = findCustomEmoji(guild, emojiName);
    const button = new ButtonBuilder()
        .setCustomId(customId)
        .setStyle(ButtonStyle.Secondary);

    return button.setEmoji(customEmoji
        ? { id: customEmoji.id, name: customEmoji.name }
        : fallbackEmoji);
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

        try {
            await interaction.guild.emojis.fetch();
        } catch (error) {
            console.warn("[TempVoice Panel] No pude actualizar la lista de emojis:", error);
        }

        const embed = new EmbedBuilder()
            .setColor("#8A2BE2")
            .setTitle("🎛️ | PANEL DE VOZ")
            .setDescription(
                "Esta interfaz te permite administrar tu canal de voz temporal.\n" +
                "Conéctate a tu sala y pulsa el icono de la función que quieras usar.\n\n" +
                "Las acciones de propietario solo funcionan en tu canal temporal."
            )
            .setImage("attachment://tempvoice.png")
            .setFooter({ text: "Bryant's Oficial • TempVoice" });

        const buttonDefinitions = [
            { label: "NOMBRE", customId: "temp_rename", emojiName: "01_nombre", fallback: "✏️" },
            { label: "LÍMITE", customId: "temp_limit", emojiName: "02_limite", fallback: "👥" },
            { label: "PRIVACIDAD", customId: "temp_privacy_menu", emojiName: "03_privacidad", fallback: "🔒" },
            { label: "SALA DE ESPERA", customId: "temp_waiting", emojiName: "04_sala_espera", fallback: "🕒" },
            { label: "CHAT", customId: "temp_chat", emojiName: "05_chat", fallback: "💬" },
            { label: "PERMITIR", customId: "temp_trust", emojiName: "06_permitir", fallback: "✅" },
            { label: "QUITAR PERMISO", customId: "temp_untrust", emojiName: "07_quitar_permiso", fallback: "🚫" },
            { label: "INVITAR", customId: "temp_invite", emojiName: "08_invitar", fallback: "📞" },
            { label: "EXPULSAR", customId: "temp_kick", emojiName: "09_expulsar", fallback: "👢" },
            { label: "REGIÓN", customId: "temp_region", emojiName: "10_region", fallback: "🌐" },
            { label: "BLOQUEAR", customId: "temp_block", emojiName: "11_bloquear", fallback: "⛔" },
            { label: "DESBLOQUEAR", customId: "temp_unblock_user", emojiName: "12_desbloquear", fallback: "🔓" },
            { label: "RECLAMAR", customId: "temp_claim", emojiName: "13_reclamar", fallback: "👑" },
            { label: "TRANSFERIR", customId: "temp_transfer", emojiName: "14_transferir", fallback: "🔁" },
            { label: "ELIMINAR SALA", customId: "temp_delete", emojiName: "15_eliminar_sala", fallback: "🗑️" }
        ];

        const buttons = buttonDefinitions.map(definition =>
            createButton(
                interaction.guild,
                definition.customId,
                definition.emojiName,
                definition.fallback
            )
        );
        const missingLogos = buttonDefinitions.filter(definition =>
            !findCustomEmoji(interaction.guild, definition.emojiName)
        );

        const rows = [];
        for (let index = 0; index < buttons.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(index, index + 5)));
        }

        try {
            await interaction.channel.send({
                embeds: [embed],
                files: [{
                    attachment: path.join(__dirname, "../../Assets/tempvoice.png"),
                    name: "tempvoice.png"
                }],
                components: rows
            });
            return interaction.reply({
                content: missingLogos.length
                    ? `✅ Panel TempVoice enviado. No encontré estos emojis personalizados: ${missingLogos.map(item => `\`${item.emojiName}\``).join(", ")}. Instálalos con /setup tempvoice-emojis y vuelve a publicar el panel.`
                    : "✅ Panel TempVoice enviado correctamente con los 15 logos personalizados.",
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
