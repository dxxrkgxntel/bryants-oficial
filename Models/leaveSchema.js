const {model, Schema} = require('mongoose');

let leaveSchema = new Schema({
    Guild:String,
    Channel: String,
    Title: String,
    MessageDes:String,
    Banner: String,
    Thumbnail: String,
    Color: String,
    embedAuthorName: String,
    embedAuthorUrl: String,
    embedAuthorIcon: String,
    embedFooterText: String,
    embedFooterIcon: String,
    embedTimestamp: { type: Boolean, default: false }
})

module.exports = model("leave", leaveSchema)
