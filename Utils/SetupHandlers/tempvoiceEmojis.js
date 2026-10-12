const {
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const emojiNames = [
    "tv_limit",
    "tv_privacy",
    "tv_waiting",
    "tv_chat",
    "tv_permit",
    "tv_unpermit",
    "tv_invite",
    "tv_kick",
    "tv_region",
    "tv_block",
    "tv_unblock",
    "tv_name"
];

module.exports = {
    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo los administradores pueden instalar los logos de TempVoice.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const botMember = interaction.guild.members.me;
        if (!botMember?.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            return interaction.editReply(
                "❌ Necesito el permiso **Administrar expresiones** para instalar los logos en este servidor."
            );
        }

        try {
            await interaction.guild.emojis.fetch();

            const missingNames = emojiNames.filter(name =>
                !interaction.guild.emojis.cache.some(emoji => emoji.name === name)
            );
            const maxEmojis = interaction.guild.maximumEmojis ?? 50;
            const availableSlots = Math.max(0, maxEmojis - interaction.guild.emojis.cache.size);

            if (missingNames.length > availableSlots) {
                return interaction.editReply(
                    `❌ Faltan ${missingNames.length} espacios para emojis, pero el servidor solo tiene ${availableSlots} disponibles. Libera espacios y vuelve a ejecutar /setup tempvoice-emojis.`
                );
            }

            const assetDirectory = path.join(__dirname, "../../Assets/TempVoiceEmojis");
            const missingFiles = missingNames.filter(name =>
                !fs.existsSync(path.join(assetDirectory, `${name}.png`))
            );
            if (missingFiles.length) {
                throw new Error(`No se encontraron los archivos: ${missingFiles.join(", ")}`);
            }

            let created = 0;
            for (const name of missingNames) {
                await interaction.guild.emojis.create({
                    attachment: path.join(assetDirectory, `${name}.png`),
                    name,
                    reason: `Instalación de logos del panel TempVoice por ${interaction.user.tag}`
                });
                created += 1;
            }

            return interaction.editReply(
                created
                    ? `✅ Logos de TempVoice instalados: **${created}**. Ya puedes publicar el panel con /setup tempvoice-panel para que use los iconos personalizados.`
                    : "✅ Los logos de TempVoice ya estaban instalados. Vuelve a publicar el panel con /setup tempvoice-panel para actualizar sus iconos."
            );
        } catch (error) {
            console.error("[TempVoice Emojis] Error al instalar logos:", error);
            return interaction.editReply(
                "❌ No pude instalar los logos de TempVoice. Revisa mis permisos y los espacios de emojis del servidor."
            );
        }
    }
};
