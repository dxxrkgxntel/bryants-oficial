const {EmbedBuilder} = require('discord.js')

function errorReply(interaction,razon,invisible){
    interaction.reply({
        embeds:[
            new EmbedBuilder()
            .setTitle('<:a_:1093633658801373346> Error')
            .addFields(
                {name:'Error', value:`\`\`\`yaml\n${razon}\`\`\``}
            )
            .setColor('#8A2BE2')
        ],
        ephemeral:invisible
    })
}

module.exports = errorReply