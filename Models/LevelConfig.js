const mongoose = require("mongoose");

const levelConfigSchema =
    new mongoose.Schema({

        guildId: String,

        levelChannel: String
    });

module.exports =
    mongoose.model(
        "LevelConfig",
        levelConfigSchema
    );