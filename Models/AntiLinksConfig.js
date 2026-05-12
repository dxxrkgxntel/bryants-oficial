const mongoose =
    require("mongoose");

module.exports =
    mongoose.model(

        "AntiLinksConfig",

        new mongoose.Schema({

            guildId: String,

            allowedChannels: {

                type: [String],

                default: []
            },

            enabled: {

                type: Boolean,

                default: true
            }
        })
    );