const mongoose = require("mongoose");

const questSchema = new mongoose.Schema({

    guildId: String,

    questId: String,

    name: String,

    description: String,



    type: {
        type: String,
        enum: ["daily", "weekly"]
    },



    category: String,



    goal: Number,



    reward: {

        coins: {
            type: Number,
            default: 0
        },

        xp: {
            type: Number,
            default: 0
        }

    },



    enabled: {
        type: Boolean,
        default: true
    },



    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model(
    "Quest",
    questSchema
);