const { EmbedBuilder } = require('discord.js');
const welcomeSchema = require('../../Models/welcomeSchema');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {

    try {
      const data = await welcomeSchema.findOne({ Guild: member.guild.id });
      if (!data) return;

      const channel = member.guild.channels.cache.get(data.Channel);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle(`Bienvenidx a ${member.guild.name}`)
        .setDescription(data.MessageDes || 'Bienvenido!')
        .setColor(data.Color || '#8A2BE2')

      // 🔥 THUMBNAIL (con fallback inteligente)
      embed.setThumbnail(
        data.Thumbnail || member.user.displayAvatarURL({ dynamic: true })
      );

      // 🔥 IMAGEN
      if (data.ImagenDesc) {
        embed.setImage(data.ImagenDesc);
      }

      await channel.send({
        content: `🎉 Bienvenido ${member}!`,
        embeds: [embed]
      });

    } catch (error) {
      console.log(error);
    }
  }
};