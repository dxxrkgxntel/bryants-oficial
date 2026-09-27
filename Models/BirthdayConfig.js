const mongoose =
    require("mongoose");

module.exports =
    mongoose.model(

        "BirthdayConfig",

        new mongoose.Schema({

            //////////////////////////////////////////////////
            // GUILD
            //////////////////////////////////////////////////

            guildId: {

                type: String,

                required: true,

                unique: true
            },

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            channelId: {

                type: String,

                default: null
            },

            roleId: {

                type: String,

                default: null
            },
        })
    );