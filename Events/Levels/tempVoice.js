const {ChannelType} = require("discord.js");
const tempVoiceSchema = require("../../Models/tempVoiceSchema");
const tempVoiceChannels = require("../../Models/tempVoiceChannels");

module.exports = {

    name: "voiceStateUpdate",

    //////////////////////////////////////////////////

    async execute(oldState, newState) {

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const member =
            newState.member;

        if (!member) return;

        if (member.user.bot) return;

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const data =
            await tempVoiceSchema.findOne({

                guildId:
                    newState.guild.id
            });

        //////////////////////////////////////////////////

        if (!data) return;

        //////////////////////////////////////////////////
        // ENTRAR CANAL CREADOR
        //////////////////////////////////////////////////

        if (
            newState.channelId ===
            data.creatorChannelId
        ) {

            //////////////////////////////////////////////////
            // CREAR CANAL
            //////////////////////////////////////////////////

            const channel =
                await newState.guild.channels.create({

                    name:
                        `${member.user.username}'s Room`,

                    type:
                        ChannelType.GuildVoice,

                    parent:
                        data.categoryId,

                    permissionOverwrites: [

                        {
                            id: member.id,

                            allow: [
                                "ManageChannels",
                                "MoveMembers"
                            ]
                        }
                    ]
                });

            //////////////////////////////////////////////////
            // MOVER USER
            //////////////////////////////////////////////////

            await member.voice.setChannel(
                channel
            );

            //////////////////////////////////////////////////
            // GUARDAR DB
            //////////////////////////////////////////////////

            await tempVoiceChannels.create({

                guildId:
                    newState.guild.id,

                channelId:
                    channel.id,

                ownerId:
                    member.id,

                name:
                    channel.name,

                limit: 0,

                bitrate:
                    channel.bitrate,

                region:
                    "auto",

                locked: false,

                hidden: false
            });
        }

        //////////////////////////////////////////////////
        // ELIMINAR VACIOS
        //////////////////////////////////////////////////

        if (
            oldState.channelId
        ) {

            //////////////////////////////////////////////////

            const tempChannel =
                await tempVoiceChannels.findOne({

                    channelId:
                        oldState.channelId
                });

            //////////////////////////////////////////////////

            if (!tempChannel) return;

            //////////////////////////////////////////////////

            const channel =
                oldState.guild.channels.cache.get(

                    oldState.channelId
                );

            //////////////////////////////////////////////////

            if (!channel) return;

            //////////////////////////////////////////////////
            // OWNER LEFT
            //////////////////////////////////////////////////

            if (
                tempChannel.ownerId ===
                oldState.id
            ) {

                //////////////////////////////////////////////////

                const newOwner =
                    channel.members.first();

                //////////////////////////////////////////////////

                if (newOwner) {

                    //////////////////////////////////////////////////

                    tempChannel.ownerId =
                        newOwner.id;

                    //////////////////////////////////////////////////

                    await tempChannel.save();

                    //////////////////////////////////////////////////

                    await channel.permissionOverwrites.edit(

                        newOwner.id,

                        {
                            ManageChannels: true,
                            MoveMembers: true
                        }
                    );

                    //////////////////////////////////////////////////

                    return;
                }
            }

            //////////////////////////////////////////////////
            // ELIMINAR SI VACIO
            //////////////////////////////////////////////////

            if (
                channel.members.size === 0
            ) {

                //////////////////////////////////////////////////

                await tempVoiceChannels.deleteOne({

                    channelId:
                        channel.id
                });

                //////////////////////////////////////////////////

                await channel.delete()
                    .catch(() => {});
            }
        }
    }
};