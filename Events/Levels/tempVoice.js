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

        const creatorSetup = (data.setups || []).find(setup => setup.creatorChannelId === newState.channelId);
        const isCreatorChannel = creatorSetup || data.creatorChannelId === newState.channelId;

        if (isCreatorChannel) {

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
                        creatorSetup?.categoryId || data.categoryId,

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

                textChannelId: creatorSetup?.panelChannelId || data.panelChannelId || null,

                waitingRoomChannelId: null,

                threadId: null,

                chatClosed: false,

                trustedUserIds: []
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
                    const canWrite = !joinedTempChannel.chatClosed ||
                        member.id === joinedTempChannel.ownerId ||
                        (joinedTempChannel.trustedUserIds || []).includes(member.id);
                    await chatChannel.permissionOverwrites.edit(member.id, {
                        ViewChannel: true,
                        SendMessages: canWrite,
                        ReadMessageHistory: true
                    }).catch(() => {});
                }
            }
            if (joinedTempChannel?.threadId) {
                const thread = await newState.guild.channels.fetch(joinedTempChannel.threadId).catch(() => null);
                const isTrusted = (joinedTempChannel.trustedUserIds || []).includes(member.id);
                if (thread?.isThread() &&
                    (!joinedTempChannel.chatClosed || isTrusted || member.id === joinedTempChannel.ownerId)) {
                    if (thread.archived) await thread.setArchived(false).catch(() => {});
                    await thread.members.add(member.id).catch(() => {});
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

            if (tempChannel.textChannelId &&
                !(tempChannel.trustedUserIds || []).includes(oldState.id) &&
                tempChannel.ownerId !== oldState.id) {
                const chatChannel = await oldState.guild.channels.fetch(tempChannel.textChannelId).catch(() => null);
                if (chatChannel) {
                    await chatChannel.permissionOverwrites.delete(oldState.id).catch(() => {});
                }
            }
            if (tempChannel.threadId &&
                !(tempChannel.trustedUserIds || []).includes(oldState.id) &&
                tempChannel.ownerId !== oldState.id) {
                const thread = await oldState.guild.channels.fetch(tempChannel.threadId).catch(() => null);
                if (thread?.isThread()) await thread.members.remove(oldState.id).catch(() => {});
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

                    const oldOwnerTrusted = (tempChannel.trustedUserIds || []).includes(oldState.id);
                    await channel.permissionOverwrites.edit(oldState.id, {
                        ViewChannel: oldOwnerTrusted ? true : null,
                        Connect: oldOwnerTrusted ? true : null,
                        ManageChannels: null,
                        MoveMembers: null
                    }).catch(() => {});

                    if (!oldOwnerTrusted) {
                        if (tempChannel.textChannelId) {
                            const oldChat = await oldState.guild.channels.fetch(tempChannel.textChannelId).catch(() => null);
                            if (oldChat) await oldChat.permissionOverwrites.delete(oldState.id).catch(() => {});
                        }
                        if (tempChannel.threadId) {
                            const oldThread = await oldState.guild.channels.fetch(tempChannel.threadId).catch(() => null);
                            if (oldThread?.isThread()) await oldThread.members.remove(oldState.id).catch(() => {});
                        }
                    }

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

                    if (tempChannel.threadId) {
                        const thread = await oldState.guild.channels.fetch(tempChannel.threadId).catch(() => null);
                        if (thread?.isThread()) {
                            if (thread.archived) await thread.setArchived(false).catch(() => {});
                            await thread.members.add(newOwner.id).catch(() => {});
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

                if (tempChannel.threadId) {
                    const thread = await oldState.guild.channels.fetch(tempChannel.threadId).catch(() => null);
                    if (thread) await thread.delete("La sala temporal quedó vacía").catch(() => {});
                }

                if (tempChannel.textChannelId) {
                    const chatChannel = await oldState.guild.channels.fetch(tempChannel.textChannelId).catch(() => null);
                    if (chatChannel) await chatChannel.delete("La sala temporal quedó vacía").catch(() => {});
                }

                if (tempChannel.waitingRoomChannelId) {
                    const waiting = await oldState.guild.channels.fetch(tempChannel.waitingRoomChannelId).catch(() => null);
                    if (waiting) await waiting.delete("La sala temporal quedó vacía").catch(() => {});
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
