const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-info')   
        .setDescription(`Encuentra información sobre un usuario en el servidor`)
        .setDMPermission(false)
        .addUserOption(option => option 
            .setName('user')
            .setDescription(`El usuario sobre el que quieres obtener información`)
            .setRequired(false)
        ),
    async execute(interaction) {
        try {

            const user = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const userAvatar = user.displayAvatarURL({dynamic: true, size: 1024});
            const badges = user.flags?.toArray()?.join(', ') || 'Ninguna';
            const botStatus = user.bot ? 'Si' : 'No';
            
            const embed = new EmbedBuilder()
                .setTitle(`Información de ${user.username}`) 
                .setColor('#8A2BE2')
                .setThumbnail(userAvatar)
                .addFields({
                    name: `¿Cuándo se unió a discord?:`,
                    value: `<t:${parseInt(user.createdAt / 1000)}:R>`,
                    inline: true
                })
                .addFields({
                    name: `¿Cuándo se unió al servidor?:`,
                    value: member?.joinedTimestamp? `<t:${parseInt(member.joinedTimestamp / 1000)}:R>`: 'Desconocido',
                    inline: true
                })
                .addFields({
                    name: `¿Ha potenciado el server?:`,
                    value: member.premiumSince ? 'Si' : 'No',
                    inline: false
                })
                .addFields({ 
                    name: '¿Es un bot?:',
                    value: botStatus,
                    inline: false
                })
                .addFields({ 
                    name: 'Sus Insignias:',
                    value: badges || 'None',
                    inline: false
                })
                .setTimestamp()
                .setFooter({ text: `ID de usuario: ${user.id}`})

            await interaction.reply({ embeds: [embed], flags: 64 });
            
        } catch (error) {

    console.error(error);

    if (interaction.replied || interaction.deferred) {

        await interaction.followUp({

            content:
                "❌ Se produjo un error.",

            flags: 64
        });

    } else {

        await interaction.reply({

            content:
                "❌ Se produjo un error.",

            flags: 64
        });
    }
}
    }
}
