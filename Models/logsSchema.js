const mongoose = require("mongoose");

const logsSchema = new mongoose.Schema({

    Guild: String,
    Channel: String,
    Enabled: { type: Boolean, default: true },
    ignoredChannels: { type: [String], default: [] },
    ignoredRoles: { type: [String], default: [] }

});

module.exports = mongoose.model("logsSchema", logsSchema);
