const isLogIgnored = require("../../Utils/logsIgnored");
const {
    EmbedBuilder
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    name: "voiceStateUpdate",

    async execute(oldState, newState) {

        try {

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({
                    Guild: newState.guild.id
                });

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                newState.guild.channels.cache.get(
                    data.Channel
                );

            if (!channel) return;
            if (await isLogIgnored(data, newState.guild, [oldState.channelId, newState.channelId], newState.member?.id)) return;

            //////////////////////////////////////////////////
            // USER
            //////////////////////////////////////////////////

            const user =
                newState.member.user;

            //////////////////////////////////////////////////
            // JOIN VOICE
            //////////////////////////////////////////////////

            if (
                !oldState.channel &&
                newState.channel
            ) {

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🔊 - Usuario entró a voz")
                        .setDescription(`👤 Usuario: ${user}\n` +`🎧 Canal: ${newState.channel}`)
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // LEAVE VOICE
            //////////////////////////////////////////////////

            if (
                oldState.channel &&
                !newState.channel
            ) {

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("📤 - Usuario salió de voz")
                        .setDescription(`👤 Usuario: ${user}\n` +`🎧 Canal: ${oldState.channel}`)
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // MOVE CHANNEL
            //////////////////////////////////////////////////

            if (
                oldState.channelId &&
                newState.channelId &&
                oldState.channelId !==
                newState.channelId
            ) {

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🔁 - Usuario cambió de canal")
                        .setDescription(`👤 Usuario: ${user}\n\n` +`📤 Antes: ${oldState.channel}\n` +`📥 Ahora: ${newState.channel}`)
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // MUTE
            //////////////////////////////////////////////////

            if (
                !oldState.selfMute &&
                newState.selfMute
            ) {

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🔇 - Usuario se muteó")
                        .setDescription(`👤 ${user}`)
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // UNMUTE
            //////////////////////////////////////////////////

            if (
                oldState.selfMute &&
                !newState.selfMute
            ) {

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🔊 - Usuario se desmuteó")
                        .setDescription(`👤 ${user}`)
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

            //////////////////////////////////////////////////
            // STREAM
            //////////////////////////////////////////////////

            if (
                !oldState.streaming &&
                newState.streaming
            ) {

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("📺 - Usuario comenzó stream")
                        .setDescription(`👤 ${user}\n🎧 ${newState.channel}`)
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                return channel.send({embeds: [embed]});
            }

        } catch (error) {

            console.log(error);

        }
    }
};
