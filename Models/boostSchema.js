const mongoose = require("mongoose");

module.exports = mongoose.model(
    "boostSystem",

    new mongoose.Schema({

        guildId: String,

        boosterRole: String,

        boosterVipRole: String,

        boosterLegendRole: String
    })
);