const { model, Schema } = require('mongoose');

let suggestSchema = new Schema({
    guildSuggest: String,
    guildChannel: String,
    Enabled: Boolean,
    createThreads: { type: Boolean, default: false },
})

module.exports = model("suggest", suggestSchema)
