const ImageConfig = require("../../Models/ImageConfig");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "messageCreate",

    async execute(message) {

        if (message.author.bot || !message.guild) return;

        const config = await ImageConfig.findOne({
            guildId: message.guild.id
        });

        if (!config) return;

        // 🔍 detectar imágenes
        const hasAttachment = message.attachments.size > 0;
        const hasImageLink = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i.test(message.content);
        const hasEmbedImage = message.embeds.some(e => e.image || e.thumbnail);

        const isImage = hasAttachment || hasImageLink || hasEmbedImage;
        if (!isImage) return;

        // ✅ permitido
        if (config.allowedChannels.includes(message.channel.id)) return;

        // ❌ borrar
        await message.delete().catch(() => {});

        // 📜 LOGS
        if (config.logChannel) {
            const logChannel = message.guild.channels.cache.get(config.logChannel);

            if (logChannel) {

                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🚫 Imagen bloqueada")
                    .addFields(
                        { name: "👤 Usuario", value: `${message.author}`, inline: true },
                        { name: "📍 Canal", value: `${message.channel}`, inline: true },
                        { name: "📝 Contenido", value: message.content || "Sin texto" }
                    );

                // 🔥 THUMBNAIL DESDE CONFIG
                embed.setThumbnail(
                    config.thumbnail || message.author.displayAvatarURL({ dynamic: true })
                );

                // 🔥 IMAGEN DESDE CONFIG
                if (config.image) {
                    embed.setImage(config.image);
                }

                await logChannel.send({ embeds: [embed] });
            }
        }

        // ⚠️ aviso temporal
        const warn = await message.channel.send({
            content: `🚫 ${message.author}, solo imágenes en canales permitidos`
        });

        setTimeout(() => warn.delete().catch(() => {}), 3000);
    }
};