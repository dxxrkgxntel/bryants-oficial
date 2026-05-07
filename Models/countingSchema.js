const { model, Schema } = require('mongoose');

const countingSchema = new Schema({
    guildId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        default: 0
    },
    lastPerson: {
        type: String,
        default: null
    }
});

module.exports = model('conteo', countingSchema);