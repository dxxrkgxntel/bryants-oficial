const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const boostSchema = require("../../Models/boostSchema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boost-preview")
        .setDescription("Envía una vista previa del mensaje del sistema Booster")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const data = await boostSchema.findOne({ guildId: interaction.guild.id });

            if (!data || !data.boostChannel) {
                return interaction.editReply({
                    content: "❌ Primero debes configurar el sistema con `/setup boost`."
                });
            }

            const channel = interaction.guild.channels.cache.get(data.boostChannel);
            if (!channel || !channel.isTextBased()) {
                return interaction.editReply({
                    content: "❌ El canal Booster configurado no existe o ya no es válido."
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

            const containerComponents = [];
            if (data.boostImage) {
                containerComponents.push({
                    type: 12,
                    items: [{ media: { url: data.boostImage } }]
                });
                containerComponents.push({ type: 14, divider: true, spacing: 1 });
            }

            containerComponents.push(
                { type: 10, content: "## 🚀 Nuevo Boost" },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: description }
            );

            if (data.boostThumbnail) {
                containerComponents.push(
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 9,
                        components: [{ type: 10, content: "### 💜 Nuevo miembro de la familia Booster" }],
                        accessory: { type: 11, media: { url: data.boostThumbnail } }
                    }
                );
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("claim_booster").setLabel("BOOSTER").setEmoji("<:booster:1503957081068142662>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("claim_booster_vip").setLabel("BOOSTER VIP").setEmoji("<:booster_vip:1503957123871019139>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("claim_booster_legend").setLabel("BOOSTER LEGEND").setEmoji("<:booster_legend:1503958247458078840>").setStyle(ButtonStyle.Secondary)
            );

            containerComponents.push({ type: 14, divider: true, spacing: 1 }, row.toJSON());

            await channel.send({
                flags: MessageFlags.IsComponentsV2,
                components: [{
                    type: 17,
                    accent_color: 0x8A2BE2,
                    components: containerComponents
                }]
            });

            return interaction.editReply({
                content: `✅ Vista previa Components V2 enviada correctamente en ${channel}.`
            });
        } catch (error) {
            console.log("❌ Error en boost-preview:", error);
            const message = "❌ Ocurrió un error al enviar la vista previa del sistema Booster.";
            if (interaction.deferred || interaction.replied) return interaction.editReply({ content: message }).catch(() => null);
            return interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
    }
};
