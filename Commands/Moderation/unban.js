const {SlashCommandBuilder,PermissionFlagsBits,EmbedBuilder} = require('discord.js')

module.exports = {
    data:new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbanea a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) // 🔥 OCULTA COMANDO
    .addStringOption(option=>
        option.setName('usuario')
        .setDescription('Ingresa la id del usuario')
        .setRequired(true)
    ),

    async execute(interaction){

        // 🔒 PROTECCIÓN REAL (AÑADIDO)
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: "❌ No tienes permisos para usar este comando",
                ephemeral: true
            });
        }

        const {channel, options} = interaction
        const userId = options.getString('usuario')

        const unbanEmbed = new EmbedBuilder()

        try {
            await interaction.guild.members.unban(userId)

            unbanEmbed.setTitle('✅| Usuario fue desbaneado correctamente')
            .setDescription(`<@${userId}> fue desbaneado.\nDesbaneado por: ${interaction.user.tag}`)
            .setColor('#8A2BE2')
            .setTimestamp()

            await interaction.reply({embeds:[unbanEmbed]})

        } catch (error) {
            console.log(error); // 🔥 (arreglé typo sin romper lógica)
            return interaction.reply({content:`Ocurrio un error al tratar de desbanear a ${userId}`})
        }
    }
};