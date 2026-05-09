const mongoose = require("mongoose");

module.exports =
    mongoose.model(

        "reactionRoles",

        new mongoose.Schema({

            guildId: String,
            channelId: String,
            messageId: String,
            embedTitle: String,
            embedDescription: String,

        menus: [

            {
                customId: String,
                placeholder: String,
                maxValues: Number,

        roles: [

            {
                roleId: String,
                label: String,
                emoji: String,
                description: String
            }
                ]
            }
                ]
        })
    );