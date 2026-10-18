const isLogIgnored = require("../../Utils/logsIgnored");
const {
    EmbedBuilder,
    AuditLogEvent
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

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // LOG CHANNEL
            //////////////////////////////////////////////////

            const logs =
                newChannel.guild.channels.cache.get(
                    data.Channel
                );

            if (!logs) return;
            if (await isLogIgnored(data, newChannel.guild, newChannel.id)) return;
            const audit = await newChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate }).catch(() => null);
            const actorId = audit?.entries.first()?.executor?.id;
            if (await isLogIgnored(data, newChannel.guild, newChannel.id, actorId)) return;

            //////////////////////////////////////////////////
            // EMBED BASE
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("✏️ - Canal Actualizado")
                    .setThumbnail('https://i.imgur.com/2xTDN4W.png')
                    .setImage('https://i.imgur.com/joAe57D.png')

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
