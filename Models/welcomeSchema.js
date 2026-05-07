const {model, Schema} = require('mongoose');

let welcomeSchema = new Schema({
    Thumbnail: String,
    ImagenDesc: String,
    Color: String,
    MessageDes: String,
    Channel: String,
    Guild: String,
})

module.exports = model("welcome", welcomeSchema)