const mongoose =
    require("mongoose");

module.exports =
    mongoose.model(

        "BankDonorRole",

        new mongoose.Schema({

            guildId: String,

            roleId: String,

            requiredAmount: Number
        })
    );