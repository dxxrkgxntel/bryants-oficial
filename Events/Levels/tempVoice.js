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
                        `Sala de ${member.displayName}`,

                    type:
                        ChannelType.GuildVoice,

                    parent:
                        data.categoryId,

                    permissionOverwrites: [
                        {
                            id: newState.guild.id,
                            allow: ["ViewChannel", "Connect"]
                        },
                        {
                            id: member.id,
                            allow: ["ViewChannel", "Connect", "ManageChannels", "MoveMembers"]
                        }
                    ]
                });

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

                hidden: false,

                waitingRoom: false,

                textChannelId: null
            });

            try {
                await member.voice.setChannel(channel);
            } catch (error) {
                await tempVoiceChannels.deleteOne({ channelId: channel.id }).catch(() => {});
                await channel.delete("No se pudo mover al usuario al canal temporal").catch(() => {});
                throw error;
            }
        }

        //////////////////////////////////////////////////
        // SINCRONIZAR ACCESO AL CHAT TEMPORAL
        //////////////////////////////////////////////////

        if (newState.channelId && oldState.channelId !== newState.channelId) {
            const joinedTempChannel = await tempVoiceChannels.findOne({
                guildId: newState.guild.id,
                channelId: newState.channelId
            });

            if (joinedTempChannel?.textChannelId) {
                const chatChannel = await newState.guild.channels.fetch(joinedTempChannel.textChannelId).catch(() => null);
                if (chatChannel) {
                    await chatChannel.permissionOverwrites.edit(member.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    }).catch(() => {});
                }
            }
        }

        //////////////////////////////////////////////////
        // ELIMINAR VACIOS
        //////////////////////////////////////////////////

        if (
            oldState.channelId &&
            oldState.channelId !== newState.channelId
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

            if (tempChannel.textChannelId) {
                const chatChannel = await oldState.guild.channels.fetch(tempChannel.textChannelId).catch(() => null);
                if (chatChannel) {
                    await chatChannel.permissionOverwrites.delete(oldState.id).catch(() => {});
                }
            }

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

                    await channel.permissionOverwrites.edit(oldState.id, {
                        ManageChannels: null,
                        MoveMembers: null
                    }).catch(() => {});

                    //////////////////////////////////////////////////

                    await channel.permissionOverwrites.edit(

                        newOwner.id,

                        {
                            ViewChannel: true,
                            Connect: true,
                            ManageChannels: true,
                            MoveMembers: true
                        }
                    );

                    if (tempChannel.textChannelId) {
                        const chatChannel = await oldState.guild.channels.fetch(tempChannel.textChannelId).catch(() => null);
                        if (chatChannel) {
                            await chatChannel.permissionOverwrites.edit(newOwner.id, {
                                ViewChannel: true,
                                SendMessages: true,
                                ReadMessageHistory: true
                            }).catch(() => {});
                        }
                    }

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

                if (tempChannel.textChannelId) {
                    const chatChannel = await oldState.guild.channels.fetch(tempChannel.textChannelId).catch(() => null);
                    if (chatChannel) await chatChannel.delete("La sala temporal quedó vacía").catch(() => {});
                }

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
