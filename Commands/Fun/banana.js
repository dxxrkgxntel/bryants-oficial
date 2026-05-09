const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banana')
        .setDescription('Mira cuánto te mide tu banana')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario')
                .setRequired(false)
        ),


    async execute(interaction) {
        const { options } = interaction;
        const usuario = interaction.options.getUser('usuario') || interaction.user
        const banana = [Math.floor(Math.random() * 22)]

        const embed = new EmbedBuilder()
            .setDescription(`**La banana de ${usuario.username} mide ${banana} cm.**`)
            .setColor("#8A2BE2")
            .setImage('https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=69fee174&is=69fd8ff4&hm=b48c5ce432015c93e79d154a706dcbac9e3b92c9ca8df626f7408f84fa09a57c&=&format=webp&quality=lossless&width=1208&height=483')
            .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1501666281651441925/logo_principal.png?ex=69ff8a35&is=69fe38b5&hm=93a35cefa66cd30f2730eaedc8edb5c83509e4d7ccbfcfc7ad5e24c4f9254f90&=&format=webp&quality=lossless&width=694&height=694')

        await interaction.reply({ embeds: [embed] })
    }
}