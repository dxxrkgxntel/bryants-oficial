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
                .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1501666281651441925/logo_principal.png?ex=6a02d5f5&is=6a018475&hm=9eb8204d8e0049e68f8459791e3217f177574fe301752206bf3215e55d9118c1&=&format=webp&quality=lossless&width=694&height=694')
                .setImage('https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a02d5f4&is=6a018474&hm=238e9973b8db4ea1c061a42c7547baed00c85be00364b22abb1587ed0b1576c0&=&format=webp&quality=lossless&width=1288&height=515')
                .setColor('#8A2BE2');

            leaveChannel.send({
                content: `💨 Se fue ${member}`,
                embeds: [leaveEmbed]
            });
        });
    }
};