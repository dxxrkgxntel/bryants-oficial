const { Schema, model } = require('mongoose');

const reactionRolesSchema = new Schema({

    guildId: String,

    channelId: String,

    messageId: String,

    roles: [
        {
            roleId: String,
            label: String,
            emoji: String,
            buttonId: String
        }
    ]

});

module.exports = model('reactionRoles', reactionRolesSchema);