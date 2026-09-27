const mongoose =
    require("mongoose");

module.exports =
    mongoose.model(

        "AntiLinksConfig",

        new mongoose.Schema({

            guildId: String,

            /*
            =========================
            ESTADO
            =========================
            */

            enabled: {

                type: Boolean,

                default: true

            },

            /*
            =========================
            CANALES PERMITIDOS
            =========================
            */

            allowedChannels: {

                type: [String],

                default: []

            },

            /*
            =========================
            CANAL LOGS
            =========================
            */

            logsChannel: {

                type: String,

                default: null

            }

        })
    );