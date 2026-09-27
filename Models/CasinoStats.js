const {
    Schema,
    model
} = require("mongoose");

//////////////////////////////////////////////////

const casinoStatsSchema =

    new Schema({

        guildId: String,

        userId: String,

        //////////////////////////////////////////////////
        // GENERAL
        //////////////////////////////////////////////////

        totalGames: {

            type: Number,
            default: 0
        },

        totalWins: {

            type: Number,
            default: 0
        },

        totalLosses: {

            type: Number,
            default: 0
        },

        //////////////////////////////////////////////////
        // MONEY
        //////////////////////////////////////////////////

        moneyWon: {

            type: Number,
            default: 0
        },

        moneyLost: {

            type: Number,
            default: 0
        },

        //////////////////////////////////////////////////
        // RECORDS
        //////////////////////////////////////////////////

        jackpots: {

            type: Number,
            default: 0
        },

        biggestWin: {

            type: Number,
            default: 0
        },

        currentStreak: {

            type: Number,
            default: 0
        },

        //////////////////////////////////////////////////
        // GAME STATS
        //////////////////////////////////////////////////

        gambleWins: {

            type: Number,
            default: 0
        },

        slotsWins: {

            type: Number,
            default: 0
        },

        rouletteWins: {

            type: Number,
            default: 0
        },

        coinflipWins: {

            type: Number,
            default: 0
        },

        blackjackWins: {

            type: Number,
            default: 0
        },
    });

//////////////////////////////////////////////////

module.exports =
    model(
        "CasinoStats",
        casinoStatsSchema
    );