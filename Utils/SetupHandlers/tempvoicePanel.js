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

function createButton(guild, customId, emojiName, fallbackEmoji) {
    const customEmoji = emojiName
        ? guild.emojis.cache.find(emoji => emoji.name === emojiName)
        : null;
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

        const buttons = [
            createButton(interaction.guild, "temp_rename", "tv_name", "✏️"),
            createButton(interaction.guild, "temp_limit", "tv_limit", "👥"),
            createButton(interaction.guild, "temp_privacy_menu", "tv_privacy", "🔒"),
            createButton(interaction.guild, "temp_waiting", "tv_waiting", "🕒"),
            createButton(interaction.guild, "temp_chat", "tv_chat", "💬"),

            createButton(interaction.guild, "temp_trust", "tv_permit", "✅"),
            createButton(interaction.guild, "temp_untrust", "tv_unpermit", "🚫"),
            createButton(interaction.guild, "temp_invite", "tv_invite", "📞"),
            createButton(interaction.guild, "temp_kick", "tv_kick", "👢"),
            createButton(interaction.guild, "temp_region", "tv_region", "🌐"),

            createButton(interaction.guild, "temp_block", "tv_block", "⛔"),
            createButton(interaction.guild, "temp_unblock_user", "tv_unblock", "🔓"),
            createButton(interaction.guild, "temp_claim", null, "👑"),
            createButton(interaction.guild, "temp_transfer", null, "🔁"),
            createButton(interaction.guild, "temp_delete", null, "🗑️")
        ];

        const rows = [];
        for (let index = 0; index < buttons.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(index, index + 5)));
        }

        try {
            await interaction.guild.emojis.fetch();
            await interaction.channel.send({
                embeds: [embed],
                files: [{
                    attachment: path.join(__dirname, "../../Assets/tempvoice.png"),
                    name: "tempvoice.png"
                }],
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
