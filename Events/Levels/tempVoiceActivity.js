const tempVoiceChannels =
    require("../../Models/tempVoiceChannels");

module.exports = {

    name: "presenceUpdate",

    //////////////////////////////////////////////////

    async execute(oldPresence, newPresence) {

        //////////////////////////////////////////////////

        if (!newPresence) return;

        //////////////////////////////////////////////////

        const member =
            newPresence.member;

        //////////////////////////////////////////////////

        if (!member) return;

        //////////////////////////////////////////////////

        if (!member.voice.channel) return;

        //////////////////////////////////////////////////
        // DB
        //////////////////////////////////////////////////

        const data =
            await tempVoiceChannels.findOne({

                channelId:
                    member.voice.channel.id
            });

        //////////////////////////////////////////////////

        if (!data) return;

        //////////////////////////////////////////////////
        // SOLO OWNER
        //////////////////////////////////////////////////

        if (
            data.ownerId !==
            member.id
        ) return;

        //////////////////////////////////////////////////
        // ACTIVIDAD
        //////////////////////////////////////////////////

        const activity =
            newPresence.activities.find(

                a =>
                    a.type === 0
            );

        //////////////////////////////////////////////////

        if (!activity) return;

        //////////////////////////////////////////////////

        const gameName =
            activity.name;

        //////////////////////////////////////////////////

        const newName =
            `🎮 ${gameName}`;

        //////////////////////////////////////////////////

        if (
            member.voice.channel.name ===
            newName
        ) return;

        //////////////////////////////////////////////////

        await member.voice.channel.setName(
            newName
        ).catch(() => {});
    }
};