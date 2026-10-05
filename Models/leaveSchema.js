const {model, Schema} = require('mongoose');

let leaveSchema = new Schema({
    Guild:String,
    Channel: String,
    MessageDes:String,
    Banner: String
})

module.exports = model("leave", leaveSchema)