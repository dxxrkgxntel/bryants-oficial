const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
    guildId: String,
    categoryId: String,
    usersChannel: String,
    botsChannel: String,
    totalChannel: String
});

module.exports = mongoose.model('StatsConfig', statsSchema);