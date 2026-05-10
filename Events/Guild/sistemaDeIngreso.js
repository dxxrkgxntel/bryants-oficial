const {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js");

const welcomeSchema = require("../../Models/welcomeSchema");

module.exports = {

    name: "guildMemberAdd",

    async execute(member) {

        try {

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await welcomeSchema.findOne({Guild: member.guild.id});

            //////////////////////////////////////////////////

            if (!data) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                member.guild.channels.cache.get(data.Channel);

            //////////////////////////////////////////////////

            if (!channel) return;

            //////////////////////////////////////////////////
            // FECHAS
            //////////////////////////////////////////////////

            const created = Math.floor(member.user.createdTimestamp / 1000);

            //////////////////////////////////////////////////
            // MEMBER COUNT
            //////////////////////////////////////////////////

            const memberCount = member.guild.memberCount;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor(data.Color || "#8A2BE2")
                    .setTitle(`✨ Bienvenido/a a ${member.guild.name}`)
                    .setDescription('Estamos felices de tenerte en nuestra comunidad.\n\n' +`👤 Usuario: ${member}\n` +`🆔 ID: \`${member.id}\`\n` +`📅 Cuenta creada: <t:${created}:R>\n` +`👥 Miembro número: **#${memberCount}**\n\n` +`💜 Esperamos que disfrutes tu estadía,\n` +`participes en los chats y formes parte\n` +`de esta increíble comunidad.`)
                    .setThumbnail(data.Thumbnail)
                    .setImage(data.ImagenDesc)

            //////////////////////////////////////////////////
            // BOTONES
            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Reglas")
                            .setEmoji("📜")
                            .setStyle(ButtonStyle.Link)
                            .setURL("https://discord.com/channels/1497970030787432624/1497970032548905074"),

                        new ButtonBuilder()
                            .setLabel("Soporte")
                            .setEmoji("🎫")
                            .setStyle(ButtonStyle.Link)
                            .setURL("https://discord.com/channels/1497970030787432624/1497970033005953060"),

                        new ButtonBuilder()
                            .setLabel("Invitación")
                            .setEmoji("🚀")
                            .setStyle(ButtonStyle.Link)
                            .setURL("https://discord.gg/MBWg9zCMmq")
                    );

            //////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////

            await channel.send({
                content: `🎉 ¡Bienvenido ${member}!`,
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.log(error);
        }
    }
};