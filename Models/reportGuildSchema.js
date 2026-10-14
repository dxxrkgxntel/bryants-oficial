const {model, Schema} = require('mongoose')

let reportSchema = new Schema({
    reportGuildId:String,
    reportChannelId:String,
    Enabled: { type: Boolean, default: true },
})

module.exports = model('reportGuild', reportSchema)
