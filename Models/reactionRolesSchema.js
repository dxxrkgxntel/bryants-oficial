const mongoose = require("mongoose");

module.exports = mongoose.model(

    "reactionRoles",

    new mongoose.Schema({

        //////////////////////////////////////////////////
        // GUILD
        //////////////////////////////////////////////////

        guildId: {
            type: String,
            required: true
        },

        //////////////////////////////////////////////////
        // PANEL ID
        //////////////////////////////////////////////////

        panelId: {
            type: String,
            required: true,
            unique: true
        },

        //////////////////////////////////////////////////
        // CHANNEL
        //////////////////////////////////////////////////

        channelId: {
            type: String,
            required: true
        },

        //////////////////////////////////////////////////
        // MESSAGE
        //////////////////////////////////////////////////

        messageId: {
            type: String,
            required: true
        },

        //////////////////////////////////////////////////
        // CUSTOM ID
        //////////////////////////////////////////////////

        customId: {
            type: String,
            required: true
        },

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        title: {
            type: String,
            default: "Reaction Roles"
        },

        description: {
            type: String,
            default: "Selecciona tus roles."
        },

        placeholder: {
            type: String,
            default: "Selecciona roles"
        },

        color: {
            type: String,
            default: "#8A2BE2"
        },

        image: String,
        thumbnail: String,

        //////////////////////////////////////////////////
        // ROLES
        //////////////////////////////////////////////////

        roles: [

            {
                roleId: String,
                label: String,
                description: String,
                emoji: String
            }
        ]

    },)
);