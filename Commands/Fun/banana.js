const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banana')
        .setDescription('Mira cuánto te mide.')
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
            .setColor("DarkButNotBlack")
            .setImage('https://cdn.discordapp.com/attachments/1499375657103392839/1499375701391052882/Nombre_Server.gif?ex=69f491f0&is=69f34070&hm=df6984d9f019012dce0c0ca52d009664855863ba95b26ed035544dab806664a3&')


        await interaction.reply({ embeds: [embed] })
    }
}