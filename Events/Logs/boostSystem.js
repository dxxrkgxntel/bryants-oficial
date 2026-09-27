const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const boostSchema = require("../../Models/boostSchema");

module.exports = {
    name: "guildMemberUpdate",

    async execute(oldMember, newMember) {
        try {
            // Detectar cuando el miembro comienza a boostear.
            if (oldMember.premiumSince || !newMember.premiumSince) return;

            const data = await boostSchema.findOne({ guildId: newMember.guild.id });
            if (!data || !data.boostChannel) return;

            const channel = newMember.guild.channels.cache.get(data.boostChannel);
            if (!channel || !channel.isTextBased()) return;

            const boosts = newMember.guild.premiumSubscriptionCount ??
                newMember.guild.members.cache.filter(member => member.premiumSince).size;

            const defaultDescription =
                `> {usuario} acaba de mejorar el servidor.\n\n` +
                `💜 Gracias por apoyar nuestra comunidad.\n\n` +
                `✨ Ya puedes reclamar tus recompensas\n` +
                `utilizando los botones de abajo.\n\n` +
                `🚀 Boosts actuales: **{boosts}**`;

            const replaceVariables = text => text
                .replaceAll("{usuario}", `${newMember}`)
                .replaceAll("{servidor}", newMember.guild.name)
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
                content: `💜 ¡Gracias por boostear ${newMember}!`,
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.log("❌ Error en boostSystem:", error);
        }
    }
};
