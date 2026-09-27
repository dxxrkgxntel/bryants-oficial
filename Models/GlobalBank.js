const mongoose =
    require("mongoose");

const globalBankSchema =
    new mongoose.Schema({

        guildId: {
            type: String,
            required: true,
            unique: true
        },

        balance: {
            type: Number,
            default: 0
        },

        totalCollected: {
            type: Number,
            default: 0
        },

        totalDistributed: {
            type: Number,
            default: 0
        }
    });

module.exports =
    mongoose.model(
        "GlobalBank",
        globalBankSchema
    );