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
            console.log('[MONGO DB] Esta conectado correctamente.'.green);
        }else
        console.log(`El ${client.user.username} esta online`);

        function updatePresence(){
            const activities = [
                {name:'Bryant Bot Oficial', type:ActivityType.Watching},
                {name:'Tickets Disponibles', type:ActivityType.Listening},
                {name:'Desenvolvido y creado por @bryantdx', type:ActivityType.Playing},
                {name:'Staff Servers 24/7', type:ActivityType.Streaming},
                {name:'Para ser el mejor bot', type:ActivityType.Competing},
            ];

            const activity = activities[Math.floor(Math.random()* activities.length)];

            client.user.setActivity(activity.name, {type:activity.type});
        }

        setInterval(updatePresence, 2000) // 5 Segundos
    }
};
