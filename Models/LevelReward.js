const mongoose = require("mongoose");

module.exports = mongoose.model(

    "LevelReward",

    new mongoose.Schema({

        guildId: String,

        level: Number,

        roleId: String
    })
);