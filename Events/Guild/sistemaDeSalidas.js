const { EmbedBuilder } = require('discord.js');
const leaveSchema = require('../../Models/leaveSchema');

module.exports = {
    name: 'guildMemberRemove',

    async execute(member, client) {

        leaveSchema.findOne({ Guild: member.guild.id }, async (err, data) => {

            if (err) {
                console.log(err);
                return;
            }

            if (!data) return;

            const leaveChannel = member.guild.channels.cache.get(data.Channel);
            if (!leaveChannel) return;

            const leaveDesc = data.MessageDes || 'Un usuario ha salido del servidor.';
            const leaveImg = data.ImagenDesc;
            const leaveThumbnail = data.Thumbnail;

            const { guild } = member;

            const leaveEmbed = new EmbedBuilder()
                .setTitle('🚪 Usuario salió del servidor')

                // 🔥 DESCRIPCIÓN
                .setDescription(`
${leaveDesc}

━━━━━━━━━━━━━━
💔 Sin ti somos **${guild.memberCount}** miembros
`)

                // 🔥 THUMBNAIL PERSONALIZADA
                .setThumbnail(
                    leaveThumbnail || member.user.displayAvatarURL({ dynamic: true })
                )

                // 🔥 IMAGEN PERSONALIZADA
                .setImage(leaveImg || null)

                // 🔥 COLOR
                .setColor('#8A2BE2');

            // ❌ QUITADO:
            // .setAuthor()
            // .setFooter()
            // .setTimestamp()

            leaveChannel.send({
                content: `💨 Se fue ${member}`,
                embeds: [leaveEmbed]
            });
        });
    }
};