const {model, Schema} = require('mongoose');

let welcomeSchema = new Schema({
    Thumbnail: String,
    Banner: String,
    Color: String,
    MessageDes: String,
    Channel: String,
    Guild: String,
    Title: String,
    SendDM: { type: Boolean, default: false },
    DMTitle: String,
    DMMessage: String,
    DMColor: String,
    DMBanner: String,
    DMThumbnail: String,
})

module.exports = model("welcome", welcomeSchema)
