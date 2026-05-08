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
                {name:`💜 || estoy en ${client.guilds.cache.size} servers`, type:ActivityType.Watching},
                {name:'💜 || Soporte de Tickets', type:ActivityType.Listening},
                {name:'💜 || Desenvolvido por @bryantdx', type:ActivityType.Playing},
                {name:'💜 || Staff 24/7', type:ActivityType.Streaming},
                {name:`💜 || Bryant's Oficial`, type:ActivityType.Competing},
                {name:'💜 || .gg/bryantoficial => Nueva comunidad, Nuevos Amigos.', type:ActivityType.Custom},
            ];

            const activity = activities[Math.floor(Math.random()* activities.length)];

            client.user.setActivity(activity.name, {type:activity.type});
        }

        setInterval(updatePresence, 3000)
    }
};
