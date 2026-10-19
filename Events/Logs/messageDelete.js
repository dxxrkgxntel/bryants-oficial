const isLogIgnored = require("../../Utils/logsIgnored");
const {EmbedBuilder} = require("discord.js");
const logsSchema = require("../../Models/logsSchema");

module.exports = {

    name: "messageDelete",

    async execute(message) {

        try {

            //////////////////////////////////////////////////
            // IGNORAR BOTS
            //////////////////////////////////////////////////

            if (!message?.guild || !message.author || message.author.bot) return;

            //////////////////////////////////////////////////
            // BUSCAR DATA
            //////////////////////////////////////////////////

            const data = await logsSchema.findOne({Guild: message.guild.id});

            //////////////////////////////////////////////////

            if (!data || data.Enabled === false) return;

            //////////////////////////////////////////////////
            // CANAL
            //////////////////////////////////////////////////

            const channel = message.guild.channels.cache.get(data.Channel);

            //////////////////////////////////////////////////

            if (!channel) return;
            if (await isLogIgnored(data, message.guild, message.channelId, message.author.id)) return;

            //////////////////////////////////////////////////
            // CONTENIDO
            //////////////////////////////////////////////////

            const content = message.content?.slice(0, 1000) || "Sin contenido";
            const deletedMentions = [];
            if (message.mentions?.users?.size) deletedMentions.push(...message.mentions.users.map(user => `<@${user.id}>`));
            if (message.mentions?.roles?.size) deletedMentions.push(...message.mentions.roles.map(role => `<@&${role.id}>`));
            if (message.mentions?.everyone) deletedMentions.push("@everyone/@here");

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")
                    .setTitle("🗑️ - Mensaje Eliminado")
                    .setDescription(`> Un mensaje fue eliminado.\n\n` +`👤 Autor: ${message.author}\n` +`📍 Canal: ${message.channel}\n\n` +`💬 Contenido:\n` +`\`\`\`\n${content}\n\`\`\``)
                    .addFields(...(deletedMentions.length ? [{ name: "⚠️ Posible ghost ping", value: deletedMentions.join(", ").slice(0, 1024) }] : []))
                    .setThumbnail('https://i.imgur.com/2xTDN4W.png')
                    .setImage('https://i.imgur.com/joAe57D.png')

            //////////////////////////////////////////////////
            // ENVIAR
            //////////////////////////////////////////////////

            await channel.send({embeds: [embed], allowedMentions: { parse: [] }});

        } catch (error) {

            console.log(error);
        }
    }
};