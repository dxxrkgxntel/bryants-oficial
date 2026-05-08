const {EmbedBuilder} = require('discord.js')

function errorReply(interaction,razon,invisible){
    interaction.reply({
        embeds:[
            new EmbedBuilder()
            .setTitle('✅ Se ralizo correctamente la operacion')
            .addFields(
                {name:'✅', value:`\`\`\`yaml\n${razon}\`\`\``}
            )
            .setColor('#8A2BE2')
        ],
        ephemeral:invisible
    })
}

module.exports = errorReply