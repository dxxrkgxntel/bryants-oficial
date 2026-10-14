const {model, Schema} = require('mongoose');

let leaveSchema = new Schema({
    Guild:String,
    Channel: String,
    Title: String,
    MessageDes:String,
    Banner: String,
    Thumbnail: String,
    Color: String
})

module.exports = model("leave", leaveSchema)
