const {model, Schema} = require('mongoose');

let welcomeSchema = new Schema({
    Thumbnail: String,
    Banner: String,
    ImagenDesc: String,
    Color: String,
    MessageDes: String,
    Channel: String,
    Guild: String,
    Title: String,
})

module.exports = model("welcome", welcomeSchema)