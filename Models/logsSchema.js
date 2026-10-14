const mongoose = require("mongoose");

const logsSchema = new mongoose.Schema({

    Guild: String,
    Channel: String,
    Enabled: { type: Boolean, default: true }

});

module.exports = mongoose.model("logsSchema", logsSchema);
