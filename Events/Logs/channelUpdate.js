const {
    EmbedBuilder
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    name: "channelUpdate",

    async execute(oldChannel, newChannel) {

        try {

            //////////////////////////////////////////////////
            // VALIDAR GUILD
            //////////////////////////////////////////////////

            if (!newChannel.guild) return;

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({

                    Guild: newChannel.guild.id
                });

            if (!data) return;

            //////////////////////////////////////////////////
            // LOG CHANNEL
            //////////////////////////////////////////////////

            const logs =
                newChannel.guild.channels.cache.get(
                    data.Channel
                );

            if (!logs) return;

            //////////////////////////////////////////////////
            // EMBED BASE
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("✏️ - Canal Actualizado")
                    .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                    .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

            //////////////////////////////////////////////////
            // NAME CHANGE
            //////////////////////////////////////////////////

            if (
                oldChannel.name !==
                newChannel.name
            ) {

                embed.setDescription(`📌 Canal: ${newChannel}\n\n` +`📝 Nombre anterior:\n` +`\`${oldChannel.name}\`\n\n` +`✨ Nuevo nombre:\n` +`\`${newChannel.name}\``);

                return logs.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // CATEGORY CHANGE
            //////////////////////////////////////////////////

            if (
                oldChannel.parentId !==
                newChannel.parentId
            ) {

                embed.setDescription(`📌 Canal: ${newChannel}\n\n` +`📂 Categoría anterior:\n` +`${oldChannel.parent || "`Sin categoría`"}\n\n` +`✨ Nueva categoría:\n` +`${newChannel.parent || "`Sin categoría`"}`);

                return logs.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // SLOWMODE
            //////////////////////////////////////////////////

            if (
                oldChannel.rateLimitPerUser !==
                newChannel.rateLimitPerUser
            ) {

                embed.setDescription(`📌 Canal: ${newChannel}\n\n` +`🐌 Slowmode anterior:\n` +`\`${oldChannel.rateLimitPerUser}s\`\n\n` +`✨ Nuevo slowmode:\n` +`\`${newChannel.rateLimitPerUser}s\``);

                return logs.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // NSFW
            //////////////////////////////////////////////////

            if (
                oldChannel.nsfw !==
                newChannel.nsfw
            ) {

                embed.setDescription(`📌 Canal: ${newChannel}\n\n` +`🔞 NSFW:\n` +`${newChannel.nsfw ? "✅ Activado" : "❌ Desactivado"}`);

                return logs.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // VOICE BITRATE
            //////////////////////////////////////////////////

            if (
                oldChannel.bitrate !==
                newChannel.bitrate &&
                newChannel.bitrate
            ) {

                embed.setDescription(`🎧 Canal de voz: ${newChannel}\n\n` +`📶 Bitrate anterior:\n` +`\`${oldChannel.bitrate / 1000}kbps\`\n\n` +`✨ Nuevo bitrate:\n` +`\`${newChannel.bitrate / 1000}kbps\``);

                return logs.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // USER LIMIT
            //////////////////////////////////////////////////

            if (
                oldChannel.userLimit !==
                newChannel.userLimit &&
                newChannel.userLimit !== undefined
            ) {

                embed.setDescription(`🎧 Canal de voz: ${newChannel}\n\n` +`👥 Límite anterior:\n` +`\`${oldChannel.userLimit || "∞"}\`\n\n` +`✨ Nuevo límite:\n` +`\`${newChannel.userLimit || "∞"}\``);

                return logs.send({embeds: [embed]});
            }

        } catch (error) {

            console.log(error);

        }
    }
};