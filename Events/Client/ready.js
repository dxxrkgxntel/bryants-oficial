const {ActivityType} = require('discord.js')
const mongoose = require('mongoose')
const config = require('./../../config.json')
require('colors')
module.exports = {
    name:'ready',
    once:true,
    async execute(client){
        mongoose.set('strictQuery', true)
        await mongoose.connect(config.dataBaseURL || ''),{
            keepAlive:true,
        }

        if(mongoose.connect){
            console.log('[MONGO DB] Esta conectado correctamente'.red);
        }else
        console.log(`El ${client.user.username} esta online`);

        function updatePresence(){
            const activities = [
                {name:'Bryant Oficial', type:ActivityType.Watching},
                {name:'Support All Tickets', type:ActivityType.Listening},
                {name:'Desenvolvido por @bryantdx_1', type:ActivityType.Playing},
                {name:'Staff 24/7', type:ActivityType.Streaming},
                {name:'Ser el mejor bot', type:ActivityType.Competing},
            ];

            const activity = activities[Math.floor(Math.random()* activities.length)];

            client.user.setActivity(activity.name, {type:activity.type});
        }

        setInterval(updatePresence, 5000) // 5 Segundos
    }
};
