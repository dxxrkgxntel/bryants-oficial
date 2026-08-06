const mongoose =
require("mongoose");

module.exports =
mongoose.model(

    "PrestigeConfig",

    new mongoose.Schema({

        guildId: {

            type: String,
            required: true

        },

        enabled: {

            type: Boolean,
            default: false

        },

        prestigeRoles: {

            type: Object,
            default: {}

        },

        prestigeRewards: {

            type: Object,
            default: {}

        }

    })

);