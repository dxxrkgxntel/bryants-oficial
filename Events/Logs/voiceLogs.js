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

            if (!data) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                newState.guild.channels.cache.get(
                    data.Channel
                );

            if (!channel) return;

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
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

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
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

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
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

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
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

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
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

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
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

                return channel.send({embeds: [embed]});
            }

        } catch (error) {

            console.log(error);

        }
    }
};