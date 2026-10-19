const isLogIgnored = require("../../Utils/logsIgnored");
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

            if (!oldMessage?.guild) return;
            if (!oldMessage.author || oldMessage.author.bot) return;
            if (!oldMessage.channelId || !oldMessage.id) return;

            //////////////////////////////////////////////////
            // IGNORAR SI NO CAMBIÓ
            //////////////////////////////////////////////////

            if (oldMessage.content === newMessage.content) return;
            const removedMentions = [];
            for (const user of oldMessage.mentions?.users?.values?.() || []) {
                if (!newMessage.mentions?.users?.has(user.id)) removedMentions.push(`<@${user.id}>`);
            }
            for (const role of oldMessage.mentions?.roles?.values?.() || []) {
                if (!newMessage.mentions?.roles?.has(role.id)) removedMentions.push(`<@&${role.id}>`);
            }
            if (oldMessage.mentions?.everyone && !newMessage.mentions?.everyone) removedMentions.push("@everyone/@here");

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({
                    Guild: oldMessage.guild.id
                });

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                oldMessage.guild.channels.cache.get(data.Channel);

            if (!channel) return;
            if (await isLogIgnored(data, oldMessage.guild, oldMessage.channelId, oldMessage.author.id)) return;

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

                    .addFields(...(removedMentions.length ? [{ name: "⚠️ Posible ghost ping (menciones retiradas)", value: removedMentions.join(", ").slice(0, 1024) }] : []))
                    .setThumbnail('https://i.imgur.com/2xTDN4W.png')
                    .setImage('https://i.imgur.com/joAe57D.png')

            //////////////////////////////////////////////////
            // BOTÓN
            //////////////////////////////////////////////////

            const messageURL = `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`;
            embed.setDescription(`🔗 [Ir al mensaje](${messageURL})`);

            //////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////

            await channel.send({embeds: [embed], allowedMentions: { parse: [] }});

        } catch (error) {

            console.log(error);

        }
    }
};