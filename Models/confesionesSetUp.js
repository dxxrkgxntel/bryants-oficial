const {model, Schema} = require('mongoose')

let confesionesSchema = new Schema({
    guildId:String,
    channelId:String,
    Enabled: { type: Boolean, default: true },
})

module.exports = model("confesiones", confesionesSchema)
