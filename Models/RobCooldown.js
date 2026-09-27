const mongoose =
require("mongoose");

module.exports =
mongoose.model(

    "RobCooldown",

    new mongoose.Schema({

        guildId: String,

        userId: String,

        expiresAt: Date

    })
);