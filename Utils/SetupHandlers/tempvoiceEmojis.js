const {
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const emojiDefinitions = [
    { name: "01_nombre", file: "01_nombre.png", aliases: ["tv_name"] },
    { name: "02_limite", file: "02_limite.png", aliases: ["tv_limit"] },
    { name: "03_privacidad", file: "03_privacidad.png", aliases: ["tv_privacy"] },
    { name: "04_sala_espera", file: "04_sala_espera.png", aliases: ["tv_waiting"] },
    { name: "05_chat", file: "05_chat.png", aliases: ["tv_chat"] },
    { name: "06_permitir", file: "06_permitir.png", aliases: ["tv_permit"] },
    { name: "07_quitar_permiso", file: "07_quitar_permiso.png", aliases: ["tv_unpermit"] },
    { name: "08_invitar", file: "08_invitar.png", aliases: ["tv_invite"] },
    { name: "09_expulsar", file: "09_expulsar.png", aliases: ["tv_kick"] },
    { name: "10_region", file: "10_region.png", aliases: ["tv_region"] },
    { name: "11_bloquear", file: "11_bloquear.png", aliases: ["tv_block"] },
    { name: "12_desbloquear", file: "12_desbloquear.png", aliases: ["tv_unblock"] },
    { name: "13_reclamar", file: "13_reclamar.png", aliases: ["tv_claim", "tempvoice_claim", "temp_claim", "claim", "reclamar", "crown", "corona"] },
    { name: "14_transferir", file: "14_transferir.png", aliases: ["tv_transfer", "tempvoice_transfer", "temp_transfer", "transfer", "transferir", "traspasar"] },
    { name: "15_eliminar_sala", file: "15_eliminar_sala.png", aliases: ["tv_delete", "tempvoice_delete", "temp_delete", "delete", "eliminar", "trash", "basura"] }
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

            const missingDefinitions = emojiDefinitions.filter(definition =>
                !interaction.guild.emojis.cache.some(emoji =>
                    [definition.name, ...definition.aliases].includes(emoji.name)
                )
            );
            const maxEmojis = interaction.guild.maximumEmojis ?? 50;
            const availableSlots = Math.max(0, maxEmojis - interaction.guild.emojis.cache.size);

            if (missingDefinitions.length > availableSlots) {
                return interaction.editReply(
                    `❌ Faltan ${missingDefinitions.length} espacios para emojis, pero el servidor solo tiene ${availableSlots} disponibles. Libera espacios y vuelve a ejecutar /setup tempvoice-emojis.`
                );
            }

            const assetDirectory = path.join(__dirname, "../../Assets/TempVoiceEmojis");
            const missingFiles = missingDefinitions.filter(definition =>
                !fs.existsSync(path.join(assetDirectory, definition.file))
            );
            if (missingFiles.length) {
                throw new Error(`No se encontraron los archivos: ${missingFiles.map(item => item.file).join(", ")}`);
            }

            let created = 0;
            for (const definition of missingDefinitions) {
                await interaction.guild.emojis.create({
                    attachment: path.join(assetDirectory, definition.file),
                    name: definition.name,
                    reason: `Instalación de logos del panel TempVoice por ${interaction.user.tag}`
                });
                created += 1;
            }

            return interaction.editReply(
                created
                    ? `✅ Logos de TempVoice instalados con los nombres del ZIP: **${created}**. Ya puedes publicar el panel con /setup tempvoice-panel.`
                    : "✅ Los 15 logos ya estaban instalados con sus nombres del ZIP. Vuelve a publicar el panel con /setup tempvoice-panel para actualizar sus iconos."
            );
        } catch (error) {
            console.error("[TempVoice Emojis] Error al instalar logos:", error);
            return interaction.editReply(
                "❌ No pude instalar los logos de TempVoice. Revisa mis permisos y los espacios de emojis del servidor."
            );
        }
    }
};
