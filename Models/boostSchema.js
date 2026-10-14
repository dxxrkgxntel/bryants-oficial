const mongoose = require("mongoose");

module.exports = mongoose.model(
    "boostSystem",
    new mongoose.Schema({
        guildId: String,
        boosterRole: String,
        boosterVipRole: String,
        boosterLegendRole: String,
        boostChannel: String,
        boostTitle: String,
        boostDescription: String,
        boostColor: String,
        boostThumbnail: String,
        boostImage: String
    })
);
