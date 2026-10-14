const mongoose =
    require("mongoose");

module.exports =
    mongoose.model(

        "BirthdayConfig",

        new mongoose.Schema({

            //////////////////////////////////////////////////
            // GUILD
            //////////////////////////////////////////////////

            guildId: {

                type: String,

                required: true,

                unique: true
            },

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            channelId: {

                type: String,

                default: null
            },

            roleId: {

                type: String,

                default: null
            },
            birthdayTitle: String,
            birthdayDescription: String,
            birthdayBanner: String,
            birthdayColor: String,
            birthdayReminder: String,
            birthdayReward: { type: Number, min: 0 },
            embedAuthorName: String,
            embedAuthorUrl: String,
            embedAuthorIcon: String,
            embedFooterText: String,
            embedFooterIcon: String,
            embedTimestamp: { type: Boolean, default: false },
        })
    );
