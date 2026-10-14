const {model, Schema} = require('mongoose')

let confesionesSchema = new Schema({
    guildId:String,
    channelId:String,
    Enabled: { type: Boolean, default: true },
    replyButtonsEnabled: { type: Boolean, default: false },
    repliesInThreads: { type: Boolean, default: false },
})

module.exports = model("confesiones", confesionesSchema)
