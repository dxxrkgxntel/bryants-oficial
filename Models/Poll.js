const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema({

    guildId: String,

    channelId: String,

    messageId: String,

    creatorId: String,



    question: String,



    options: [

        {

            id: String,

            text: String,

            votes: [String]

        }

    ],



    ended: {

        type: Boolean,

        default: false

    },



    endAt: Date,



    createdAt: {

        type: Date,

        default: Date.now

    }

});

module.exports = mongoose.model(
    "Poll",
    pollSchema
);