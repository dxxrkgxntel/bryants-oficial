const {EmbedBuilder} = require('discord.js')

function userPermsReply(message,razon){
    message.reply({
        embeds:[
            new EmbedBuilder()
            .setTitle('<:a_:1093633658801373346> Error')
            .addFields(
                {name:'Necesitas los siguientes permisos', value:`\`\`\`prolog\n${razon}\`\`\``}
            )
            .setColor('#8A2BE2')
        ]
    })
}

module.exports = userPermsReply