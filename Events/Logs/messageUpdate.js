const {
    EmbedBuilder
} = require("discord.js");

const logsSchema = require("../../Models/logsSchema");

module.exports = {

    name: "messageUpdate",

    async execute(oldMessage, newMessage) {

        try {

            //////////////////////////////////////////////////
            // VALIDACIONES
            //////////////////////////////////////////////////

            if (!oldMessage.guild) return;
            if (oldMessage.author?.bot) return;

            //////////////////////////////////////////////////
            // IGNORAR SI NO CAMBIÓ
            //////////////////////////////////////////////////

            if (oldMessage.content === newMessage.content) return;

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({
                    Guild: oldMessage.guild.id
                });

            if (!data) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                oldMessage.guild.channels.cache.get(data.Channel);

            if (!channel) return;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("📝 - Mensaje Editado")
                    .addFields(
                        {
                            name: "👤 Usuario",
                            value: `${oldMessage.author}`,
                            inline: true
                        },

                        {
                            name: "📍 Canal",
                            value: `${oldMessage.channel}`,
                            inline: true
                        },

                        {
                            name: "📄 Antes",
                            value:
                                oldMessage.content?.slice(0, 1024) ||
                                "`Sin texto`"
                        },

                        {
                            name: "✏️ Después",
                            value:
                                newMessage.content?.slice(0, 1024) ||
                                "`Sin texto`"
                        }
                    )

                    .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                    .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

            //////////////////////////////////////////////////
            // BOTÓN
            //////////////////////////////////////////////////

            const messageURL = `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`;
            embed.setDescription(`🔗 [Ir al mensaje](${messageURL})`);

            //////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////

            await channel.send({embeds: [embed]});

        } catch (error) {

            console.log(error);

        }
    }
};