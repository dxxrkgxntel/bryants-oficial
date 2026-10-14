const {model, Schema} = require('mongoose');

let welcomeSchema = new Schema({
    Thumbnail: String,
    Banner: String,
    Color: String,
    MessageDes: String,
    Channel: String,
    Guild: String,
    IgnoreBots: { type: Boolean, default: false },
    Title: String,
    SendDM: { type: Boolean, default: false },
    DMTitle: String,
    DMMessage: String,
    DMColor: String,
    DMBanner: String,
    DMThumbnail: String,
    Buttons: { type: Array, default: [] },
})

module.exports = model("welcome", welcomeSchema)
