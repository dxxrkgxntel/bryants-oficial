const mongoose = require("mongoose");

const logsSchema = new mongoose.Schema({

    Guild: String,
    Channel: String

});

module.exports = mongoose.model("logsSchema", logsSchema);