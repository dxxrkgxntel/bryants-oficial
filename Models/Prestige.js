const mongoose =
require("mongoose");

module.exports =
mongoose.model(

    "Prestige",

    new mongoose.Schema({

        guildId: {

            type: String,
            required: true

        },

        userId: {

            type: String,
            required: true

        },

        prestige: {

            type: Number,
            default: 0

        }

    })

);