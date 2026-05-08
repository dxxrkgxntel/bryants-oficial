const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-icon')
        .setDescription('Obtienes la imagen del servidor.'),

    async execute(interaction) {

        // 🔥 FIX PRINCIPAL (evita Unknown interaction)
        await interaction.deferReply();

        try {

            const embed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setAuthor({ 
                    name: interaction.user.tag, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setDescription(`Se está mostrando el avatar de ${interaction.guild.name}`)
                .setImage(interaction.guild.iconURL({ dynamic: true, size: 1024 }))
                .setFooter({ 
                    text: `Pedido por ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            // 🔥 IMPORTANTE: usar editReply después de defer
            await interaction.editReply({
                embeds: [embed],
            });

        } catch (error) {
            console.log(error);

            // 🔥 MANEJO PRO DE ERRORES
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: "❌ Ocurrió un error" });
            } else {
                await interaction.reply({ content: "❌ Ocurrió un error", ephemeral: true });
            }
        }
    },
};