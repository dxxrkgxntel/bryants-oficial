const mongoose = require("mongoose");

const userQuestSchema = new mongoose.Schema({

    guildId: String,

    userId: String,



    quests: [

        {

            questId: String,



            progress: {
                type: Number,
                default: 0
            },



            completed: {
                type: Boolean,
                default: false
            },



            completedAt: Date

        }

    ]

});

module.exports = mongoose.model(
    "UserQuest",
    userQuestSchema
);