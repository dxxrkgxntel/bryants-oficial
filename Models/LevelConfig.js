const mongoose = require("mongoose");

const levelConfigSchema =
    new mongoose.Schema({

        guildId: String,

        levelChannel: String,

        levelImage: String,

        levelThumbnail: String,

        levelColor: String,
        messageXpMin: { type: Number, default: 5 },
        messageXpMax: { type: Number, default: 14 },
        messageXpCooldownMs: { type: Number, default: 5000 },
        voiceXpAmount: { type: Number, default: 15 },
        voiceXpCooldownMs: { type: Number, default: 300000 },
        voiceMinMembers: { type: Number, default: 2 }


    });

module.exports =
    mongoose.model(
        "LevelConfig",
        levelConfigSchema
    );
