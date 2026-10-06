const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const boostSchema = require("../../Models/boostSchema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boost-preview")
        .setDescription("Envía una vista previa del mensaje del sistema Booster")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const data = await boostSchema.findOne({ guildId: interaction.guild.id });

            if (!data || !data.boostChannel) {
                return interaction.reply({
                    content: "❌ Primero debes configurar el sistema con `/boost-setup`.",
                    flags: 64
                });
            }

            const channel = interaction.guild.channels.cache.get(data.boostChannel);

            if (!channel || !channel.isTextBased()) {
                return interaction.reply({
                    content: "❌ El canal Booster configurado no existe o ya no es válido.",
                    flags: 64
                });
            }

            const boosts = interaction.guild.premiumSubscriptionCount ??
                interaction.guild.members.cache.filter(member => member.premiumSince).size;

            const defaultDescription =
                `> {usuario} acaba de mejorar el servidor.\n\n` +
                `💜 Gracias por apoyar nuestra comunidad.\n\n` +
                `✨ Ya puedes reclamar tus recompensas\n` +
                `utilizando los botones de abajo.\n\n` +
                `🚀 Boosts actuales: **{boosts}**`;

            const replaceVariables = text => text
                .replaceAll("{usuario}", `${interaction.member}`)
                .replaceAll("{servidor}", interaction.guild.name)
                .replaceAll("{boosts}", String(boosts));

            const description = replaceVariables(data.boostDescription || defaultDescription);

            const embed = new EmbedBuilder()
                .setColor("#8A2BE2")
                .setTitle("🚀 - Nuevo Boost")
                .setDescription(description);

            if (data.boostThumbnail) embed.setThumbnail(data.boostThumbnail);
            if (data.boostImage) embed.setImage(data.boostImage);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("claim_booster")
                    .setLabel("BOOSTER")
                    .setEmoji("<:booster:1503957081068142662>")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("claim_booster_vip")
                    .setLabel("BOOSTER VIP")
                    .setEmoji("<:booster_vip:1503957123871019139>")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("claim_booster_legend")
                    .setLabel("BOOSTER LEGEND")
                    .setEmoji("<:booster_legend:1503958247458078840>")
                    .setStyle(ButtonStyle.Secondary)
            );

            await channel.send({
                content: `💜 ¡Gracias por boostear ${interaction.member}!`,
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({
                content: `✅ Vista previa enviada correctamente en ${channel}.`,
                flags: 64
            });
        } catch (error) {
            console.log("❌ Error en boost-preview:", error);

            const payload = {
                content: "❌ Ocurrió un error al enviar la vista previa del sistema Booster.",
                flags: 64
            };

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp(payload);
            }

            return interaction.reply(payload);
        }
    }
};
