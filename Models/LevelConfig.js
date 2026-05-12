const mongoose = require("mongoose");

const levelConfigSchema =
    new mongoose.Schema({

        guildId: String,

        levelChannel: String,

        levelImage: String,

        levelThumbnail: String,

        levelColor: String


    });

module.exports =
    mongoose.model(
        "LevelConfig",
        levelConfigSchema
    );