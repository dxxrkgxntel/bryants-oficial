const {model, Schema} = require('mongoose');

let welcomeSchema = new Schema({
    Thumbnail: String,
    Banner: String,
    Color: String,
    MessageDes: String,
    Channel: String,
    Guild: String,
    Title: String,
    embedAuthorName: String,
    embedAuthorUrl: String,
    embedAuthorIcon: String,
    embedFooterText: String,
    embedFooterIcon: String,
    embedTimestamp: { type: Boolean, default: false },
})

module.exports = model("welcome", welcomeSchema)
