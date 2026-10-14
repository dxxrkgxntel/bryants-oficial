const { model, Schema } = require('mongoose');

const autoRoleType = new Schema({

    guildId: {
        type: String,
        required: true,
        unique: true
    },

    userRole: {
        type: String,
        required: true
    },

    botRole: {
        type: String,
        required: true
    },

    enabled: {
        type: Boolean,
        default: true
    }

});

module.exports = model("autoroleTyp", autoRoleType);
