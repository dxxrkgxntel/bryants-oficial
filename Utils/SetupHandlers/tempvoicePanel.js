const {
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const path = require("path");
const tempVoiceSchema = require("../../Models/tempVoiceSchema");

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
    async execute(interaction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Solo los administradores pueden enviar el panel TempVoice.",
                flags: MessageFlags.Ephemeral
            });
        }

        const setup = await tempVoiceSchema.findOne({ guildId: interaction.guildId });
        const destinations = setup?.setups?.length
            ? setup.setups.map((item, index) => ({
                channelId: item.panelChannelId,
                messageId: item.panelMessageId,
                setupIndex: index
            }))
            : setup?.panelChannelId
                ? [{ channelId: setup.panelChannelId, messageId: setup.panelMessageId, setupIndex: null }]
                : [];

        if (!destinations.length) {
            return interaction.reply({
                content: "❌ Primero configura al menos un canal con `/setup tempvoice`.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
            .setFooter({ text: "Bryvex Bot • TempVoice" });

        const buttonDefinitions = [
            { customId: "temp_rename", emojiName: "01_nombre", fallback: "✏️" },
            { customId: "temp_limit", emojiName: "02_limite", fallback: "👥" },
            { customId: "temp_privacy_menu", emojiName: "03_privacidad", fallback: "🔒" },
            { customId: "temp_waiting", emojiName: "04_sala_espera", fallback: "🕒" },
            { customId: "temp_chat", emojiName: "05_chat", fallback: "💬" },
            { customId: "temp_trust", emojiName: "06_permitir", fallback: "✅" },
            { customId: "temp_untrust", emojiName: "07_quitar_permiso", fallback: "🚫" },
            { customId: "temp_invite", emojiName: "08_invitar", fallback: "📞" },
            { customId: "temp_kick", emojiName: "09_expulsar", fallback: "👢" },
            { customId: "temp_region", emojiName: "10_region", fallback: "🌐" },
            { customId: "temp_block", emojiName: "11_bloquear", fallback: "⛔" },
            { customId: "temp_unblock_user", emojiName: "12_desbloquear", fallback: "🔓" },
            { customId: "temp_claim", emojiName: "13_reclamar", fallback: "👑" },
            { customId: "temp_transfer", emojiName: "14_transferir", fallback: "🔁" },
            { customId: "temp_delete", emojiName: "15_eliminar_sala", fallback: "🗑️" }
        ];
        const buttons = buttonDefinitions.map(definition => createButton(
            interaction.guild,
            definition.customId,
            definition.emojiName,
            definition.fallback
        ));
        const missingLogos = buttonDefinitions.filter(definition =>
            !findCustomEmoji(interaction.guild, definition.emojiName)
        );
        const rows = [];
        for (let index = 0; index < buttons.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(index, index + 5)));
        }

        const results = [];
        for (const destination of destinations) {
            const channel = await interaction.guild.channels.fetch(destination.channelId).catch(() => null);
            const permissions = channel?.permissionsFor(interaction.guild.members.me);
            if (!channel?.isTextBased() || !permissions?.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles
            ])) {
                results.push(`❌ <#${destination.channelId}>: canal no disponible o faltan permisos.`);
                continue;
            }

            const payload = {
                embeds: [embed],
                files: [{ attachment: path.join(__dirname, "../../Assets/tempvoice.png"), name: "tempvoice.png" }],
                components: rows
            };
            let message = destination.messageId
                ? await channel.messages.fetch(destination.messageId).catch(() => null)
                : null;

            try {
                if (message) {
                    await message.edit({ ...payload, attachments: [] });
                    results.push(`🔄 <#${channel.id}>: panel actualizado.`);
                } else {
                    message = await channel.send(payload);
                    results.push(`✅ <#${channel.id}>: panel enviado.`);
                }

                if (destination.setupIndex === null) {
                    await tempVoiceSchema.updateOne(
                        { guildId: interaction.guildId },
                        { $set: { panelMessageId: message.id } }
                    );
                } else {
                    await tempVoiceSchema.updateOne(
                        { guildId: interaction.guildId },
                        { $set: { [`setups.${destination.setupIndex}.panelMessageId`]: message.id } }
                    );
                }
            } catch (error) {
                console.error(`[TempVoice Panel] Error en ${channel.id}:`, error);
                results.push(`❌ <#${channel.id}>: no pude enviar o actualizar el panel.`);
            }
        }

        const missingText = missingLogos.length
            ? `\n\nNo encontré estos logos personalizados: ${missingLogos.map(item => `\`${item.emojiName}\``).join(", ")}.`
            : "";
        return interaction.editReply(`${results.join("\n")}${missingText}`);
    }
};
