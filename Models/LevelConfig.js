const mongoose = require("mongoose");

const levelConfigSchema =
    new mongoose.Schema({

        guildId: String,

        levelChannel: String,

        levelImage: String,

        levelTopImage: String,

        levelRankImage: String,

        levelProfileImage: String,

        levelGiveXpImage: String,

        levelRemoveXpImage: String,

        levelChannelImage: String,

        levelRoleImage: String,

        levelThumbnail: String,

        levelColor: String,
        levelUpTitle: String,
        levelUpDescription: String,
        messageLevelTitle: { type: String, default: undefined },
        messageLevelDescription: { type: String, default: undefined },
        voiceLevelTitle: { type: String, default: undefined },
        voiceLevelDescription: { type: String, default: undefined },
        levelRoleTitle: String,
        levelRoleDescription: String,
        levelCoinReward: { type: Number, min: 0 },
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
