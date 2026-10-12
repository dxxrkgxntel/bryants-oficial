const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ModalBuilder,
    PermissionFlagsBits,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require("discord.js");
const tempVoiceChannels = require("../../Models/tempVoiceChannels");
const tempVoiceSchema = require("../../Models/tempVoiceSchema");

const USER_ACTIONS = new Set([
    "temp_permit_modal",
    "temp_deny_modal",
    "temp_invite_modal",
    "temp_kick_modal",
    "temp_block_modal",
    "temp_unblock_modal",
    "temp_transfer_modal"
]);

const BUTTON_ACTIONS = new Set([
    "temp_lock", "temp_unlock", "temp_hide", "temp_show",
    "temp_privacy", "temp_waiting", "temp_chat", "temp_visibility",
    "temp_rename", "temp_limit", "temp_bitrate", "temp_region", "temp_privacy_menu",
    "temp_claim", "temp_transfer", "temp_delete", "temp_kick", "temp_trust", "temp_untrust", "temp_thread",
    "temp_permit", "temp_deny", "temp_invite", "temp_block", "temp_unblock_user"
]);

function ephemeral(content) {
    return { content, flags: MessageFlags.Ephemeral };
}

async function respond(interaction, content) {
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content, components: [] });
    }
    return interaction.reply(ephemeral(content));
}

async function getRoom(interaction, { requireOwner = true, channelId = null } = {}) {
    let voiceChannel = channelId
        ? interaction.guild.channels.cache.get(channelId)
        : interaction.member?.voice?.channel;
    if (channelId && !voiceChannel) {
        voiceChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    }

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) return null;

    const data = await tempVoiceChannels.findOne({
        guildId: interaction.guildId,
        channelId: voiceChannel.id
    });
    if (!data || (requireOwner && data.ownerId !== interaction.user.id)) return null;

    return { voiceChannel, data };
}

async function updateEveryonePermissions(voiceChannel, data) {
    await voiceChannel.permissionOverwrites.edit(voiceChannel.guild.roles.everyone, {
        Connect: data.locked || data.waitingRoom ? false : null,
        ViewChannel: data.hidden ? false : null
    });

    await voiceChannel.permissionOverwrites.edit(data.ownerId, {
        ViewChannel: true,
        Connect: true,
        ManageChannels: true,
        MoveMembers: true
    });
}

async function grantAccess(voiceChannel, member) {
    await voiceChannel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        Connect: true
    });
}

async function updateChatAccess(voiceChannel, data, memberId, { joined = true } = {}) {
    const trusted = (data.trustedUserIds || []).includes(memberId);
    if (data.textChannelId) {
        const chat = await voiceChannel.guild.channels.fetch(data.textChannelId).catch(() => null);
        if (chat) {
            if (!joined && !trusted && memberId !== data.ownerId) {
                await chat.permissionOverwrites.delete(memberId).catch(() => {});
            } else {
                await chat.permissionOverwrites.edit(memberId, {
                    ViewChannel: true,
                    SendMessages: data.chatClosed && !trusted && memberId !== data.ownerId ? false : true,
                    ReadMessageHistory: true
                }).catch(() => {});
            }
        }
    }

    if (data.threadId) {
        const thread = await voiceChannel.guild.channels.fetch(data.threadId).catch(() => null);
        if (thread?.isThread()) {
            const canAccessThread = memberId === data.ownerId || trusted || (joined && !data.chatClosed);
            if (canAccessThread) {
                if (thread.archived) await thread.setArchived(false).catch(() => {});
                await thread.members.add(memberId).catch(() => {});
            } else {
                await thread.members.remove(memberId).catch(() => {});
            }
        }
    }
}

function createUserPicker(action, channelId) {
    return new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId(`temp_users:${action}:${channelId}`)
            .setPlaceholder("Selecciona uno o varios usuarios")
            .setMinValues(1)
            .setMaxValues(25)
    );
}

async function handleUserSelection(interaction) {
    const [, action, channelId] = interaction.customId.split(":");
    const room = await getRoom(interaction, { channelId });
    if (!room) {
        await interaction.reply(ephemeral("❌ No eres propietario de esta sala temporal."));
        return true;
    }

    const { voiceChannel, data } = room;
    const selected = [...interaction.users.values()].filter(user => !user.bot && user.id !== data.ownerId);
    if (!selected.length) {
        await interaction.reply(ephemeral("❌ No hay usuarios válidos en la selección."));
        return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const trusted = new Set(data.trustedUserIds || []);
    const results = [];

    for (const user of selected) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) continue;

        if (action === "trust") {
            trusted.add(member.id);
            await grantAccess(voiceChannel, member);
            results.push(`✅ ${member.user.username}`);
        } else if (action === "untrust") {
            if (!trusted.has(member.id)) {
                results.push(`ℹ️ ${member.user.username} no estaba en la lista de confianza`);
                continue;
            }
            trusted.delete(member.id);
            if (data.locked || data.waitingRoom) {
                await voiceChannel.permissionOverwrites.edit(member.id, {
                    ViewChannel: data.hidden ? false : true,
                    Connect: false
                }).catch(() => {});
            } else if (data.hidden) {
                await voiceChannel.permissionOverwrites.edit(member.id, { ViewChannel: false, Connect: null }).catch(() => {});
            } else if (!voiceChannel.members.has(member.id)) {
                await voiceChannel.permissionOverwrites.delete(member.id).catch(() => {});
            }
            if ((data.locked || data.waitingRoom || data.hidden) && member.voice.channelId === voiceChannel.id) {
                await member.voice.disconnect("Se retiró la confianza de la sala temporal").catch(() => {});
            }
            results.push(`🚫 ${member.user.username}`);
        } else if (action === "invite") {
            await grantAccess(voiceChannel, member);
            const delivered = await member.send({
                content: `${interaction.user.username} te invitó a su sala temporal: https://discord.com/channels/${interaction.guildId}/${voiceChannel.id}`,
                allowedMentions: { parse: [] }
            }).then(() => true).catch(() => false);
            results.push(`${delivered ? "📨" : "✅"} ${member.user.username}${delivered ? " (invitación enviada)" : " (sin DM)"}`);
        } else if (action === "kick") {
            if (member.voice.channelId !== voiceChannel.id) continue;
            await member.voice.disconnect("Expulsado por el propietario del canal temporal").catch(() => {});
            results.push(`👢 ${member.user.username}`);
        } else if (action === "block") {
            trusted.delete(member.id);
            await voiceChannel.permissionOverwrites.edit(member.id, { ViewChannel: false, Connect: false });
            if (member.voice.channelId === voiceChannel.id) {
                await member.voice.disconnect("Bloqueado por el propietario del canal temporal").catch(() => {});
            }
            results.push(`⛔ ${member.user.username}`);
        } else if (action === "unblock") {
            await voiceChannel.permissionOverwrites.delete(member.id).catch(() => {});
            if (trusted.has(member.id) || member.id === data.ownerId) {
                await grantAccess(voiceChannel, member);
            }
            results.push(`🔓 ${member.user.username}`);
        }

        data.trustedUserIds = [...trusted];
        if (["trust", "untrust", "invite", "block"].includes(action)) {
            await updateChatAccess(voiceChannel, data, member.id, {
                joined: action === "block" ? false : action !== "untrust" || voiceChannel.members.has(member.id)
            });
        }
    }

    data.trustedUserIds = [...trusted];
    if (["trust", "untrust", "block"].includes(action)) await data.save();
    await interaction.editReply({
        content: results.length ? results.join("\n") : "❌ No había usuarios válidos para esa acción."
    });
    return true;
}

async function handlePrivacySelection(interaction) {
    const room = await getRoom(interaction);
    if (!room) {
        await interaction.reply(ephemeral("❌ Debes estar en tu canal temporal y ser su propietario."));
        return true;
    }
    const { voiceChannel, data } = room;
    const choice = interaction.values[0];

    if (choice === "lock" || choice === "unlock") {
        data.locked = choice === "lock";
        await updateEveryonePermissions(voiceChannel, data);
        await data.save();
        await interaction.reply(ephemeral(data.locked
            ? "🔒 Sala bloqueada. Solo podrán entrar usuarios autorizados."
            : "🔓 Sala desbloqueada; todos pueden unirse."));
        return true;
    }
    if (choice === "hide" || choice === "show") {
        data.hidden = choice === "hide";
        await updateEveryonePermissions(voiceChannel, data);
        await data.save();
        await interaction.reply(ephemeral(data.hidden ? "🫥 Sala invisible." : "👁️ Sala visible."));
        return true;
    }
    if (choice === "chat_closed" || choice === "chat_open") {
        data.chatClosed = choice === "chat_closed";
        await data.save();
        if (data.textChannelId) {
            const chat = await interaction.guild.channels.fetch(data.textChannelId).catch(() => null);
            if (chat) {
                await chat.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    ViewChannel: false,
                    SendMessages: false
                });
                const trusted = new Set(data.trustedUserIds || []);
                const botId = interaction.guild.members.me?.id;
                for (const [id] of chat.permissionOverwrites.cache) {
                    if (id === interaction.guild.id) continue;
                    const canWrite = !data.chatClosed || id === data.ownerId || id === botId || trusted.has(id);
                    await chat.permissionOverwrites.edit(id, { SendMessages: canWrite }).catch(() => {});
                }
                for (const member of voiceChannel.members.values()) {
                    const canWrite = !data.chatClosed || member.id === data.ownerId || trusted.has(member.id);
                    await chat.permissionOverwrites.edit(member.id, {
                        ViewChannel: true,
                        SendMessages: canWrite,
                        ReadMessageHistory: true
                    }).catch(() => {});
                }
            }
        }
        if (data.threadId) {
            const thread = await interaction.guild.channels.fetch(data.threadId).catch(() => null);
            if (thread?.isThread()) {
                await thread.members.fetch().catch(() => null);
                const trusted = new Set(data.trustedUserIds || []);
                const botId = interaction.guild.members.me?.id;
                for (const [id] of thread.members.cache) {
                    if (id === botId || id === data.ownerId || trusted.has(id)) continue;
                    if (data.chatClosed) await thread.members.remove(id).catch(() => {});
                }
                for (const member of voiceChannel.members.values()) {
                    const isTrusted = trusted.has(member.id);
                    if (!data.chatClosed || isTrusted || member.id === data.ownerId) {
                        if (thread.archived) await thread.setArchived(false).catch(() => {});
                        await thread.members.add(member.id).catch(() => {});
                    } else {
                        await thread.members.remove(member.id).catch(() => {});
                    }
                }
            }
        }
        await interaction.reply(ephemeral(data.chatClosed
            ? "💬 Chat cerrado: solo tú y los usuarios confiados pueden escribir."
            : "💬 Chat abierto para los miembros con acceso."));
        return true;
    }
    return false;
}

async function createWaitingRoom(voiceChannel, data) {
    if (data.waitingRoomChannelId) {
        const existing = await voiceChannel.guild.channels.fetch(data.waitingRoomChannelId).catch(() => null);
        if (existing) return { channel: existing, created: false };
    }
    const waiting = await voiceChannel.guild.channels.create({
        name: `🕒・espera-${voiceChannel.name}`.slice(0, 100),
        type: ChannelType.GuildVoice,
        parent: voiceChannel.parentId,
        permissionOverwrites: [
            { id: voiceChannel.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
            { id: data.ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] }
        ],
        reason: `Sala de espera para ${voiceChannel.name}`
    });
    data.waitingRoomChannelId = waiting.id;
    await data.save();
    return { channel: waiting, created: true };
}

async function createRoomThread(voiceChannel, data) {
    if (data.threadId) {
        const existing = await voiceChannel.guild.channels.fetch(data.threadId).catch(() => null);
        if (existing?.isThread()) {
            if (existing.archived) await existing.setArchived(false);
            return { channel: existing, created: false };
        }
    }

    let parent = data.textChannelId
        ? await voiceChannel.guild.channels.fetch(data.textChannelId).catch(() => null)
        : null;
    if (!parent) {
        const setup = await tempVoiceSchema.findOne({ guildId: voiceChannel.guild.id });
        parent = setup?.panelChannelId
            ? await voiceChannel.guild.channels.fetch(setup.panelChannelId).catch(() => null)
            : null;
    }
    if (!parent?.isTextBased() || !parent.threads) {
        throw new Error("No se encontró el canal de texto del panel TempVoice.");
    }
    const botPermissions = parent.permissionsFor(voiceChannel.guild.members.me);
    if (!botPermissions?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.CreatePrivateThreads,
        PermissionFlagsBits.SendMessagesInThreads,
        PermissionFlagsBits.ManageThreads
    ])) {
        throw new Error("Faltan permisos del bot para crear y administrar hilos privados en el canal TempVoice.");
    }

    const thread = await parent.threads.create({
        name: `Hilo・${voiceChannel.name}`.slice(0, 100),
        autoArchiveDuration: 1440,
        type: ChannelType.PrivateThread,
        invitable: false,
        reason: `Hilo temporal para ${voiceChannel.name}`
    });
    const memberIds = new Set([
        data.ownerId,
        ...(data.trustedUserIds || []),
        ...(!data.chatClosed ? voiceChannel.members.keys() : [])
    ]);
    await thread.members.add(data.ownerId);
    memberIds.delete(data.ownerId);
    for (const id of memberIds) await thread.members.add(id).catch(() => {});
    data.threadId = thread.id;
    await data.save();
    return { channel: thread, created: true };
}

async function openUserModal(interaction, { customId, title, label, placeholder }) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("temp_user_id")
                    .setLabel(label)
                    .setPlaceholder(placeholder || "ID o mención del usuario")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(5)
                    .setMaxLength(25)
                    .setRequired(true)
            )
        );
    return interaction.showModal(modal);
}

async function openTextModal(interaction, { customId, title, inputId, label, placeholder, maxLength = 100, required = true }) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId(inputId)
                    .setLabel(label)
                    .setPlaceholder(placeholder)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(maxLength)
                    .setRequired(required)
            )
        );
    return interaction.showModal(modal);
}

function parseUserId(input) {
    const value = input.trim();
    return value.match(/^<@!?(\d+)>$/)?.[1] || value;
}

async function resolveTarget(interaction) {
    const userId = parseUserId(interaction.fields.getTextInputValue("temp_user_id"));
    return interaction.guild.members.fetch(userId).catch(() => null);
}

async function transferOwner(voiceChannel, data, newOwner) {
    const previousOwnerId = data.ownerId;
    if (previousOwnerId !== newOwner.id) {
        const previousOwner = await voiceChannel.guild.members.fetch(previousOwnerId).catch(() => null);
        if (previousOwner?.voice.channelId === voiceChannel.id) {
            await voiceChannel.permissionOverwrites.edit(previousOwnerId, {
                ViewChannel: true,
                Connect: true,
                ManageChannels: null,
                MoveMembers: null
            });
        } else if ((data.trustedUserIds || []).includes(previousOwnerId)) {
            await voiceChannel.permissionOverwrites.edit(previousOwnerId, {
                ViewChannel: true,
                Connect: true,
                ManageChannels: null,
                MoveMembers: null
            });
        } else {
            await voiceChannel.permissionOverwrites.delete(previousOwnerId).catch(() => {});
            if (!(data.trustedUserIds || []).includes(previousOwnerId) && data.textChannelId) {
                const oldChat = await voiceChannel.guild.channels.fetch(data.textChannelId).catch(() => null);
                if (oldChat) await oldChat.permissionOverwrites.delete(previousOwnerId).catch(() => {});
            }
            if (!(data.trustedUserIds || []).includes(previousOwnerId) && data.threadId) {
                const oldThread = await voiceChannel.guild.channels.fetch(data.threadId).catch(() => null);
                if (oldThread?.isThread()) await oldThread.members.remove(previousOwnerId).catch(() => {});
            }
        }
    }

    await voiceChannel.permissionOverwrites.edit(newOwner.id, {
        ViewChannel: true,
        Connect: true,
        ManageChannels: true,
        MoveMembers: true
    });

    if (data.textChannelId) {
        const textChannel = await voiceChannel.guild.channels.fetch(data.textChannelId).catch(() => null);
        if (textChannel) {
            await textChannel.permissionOverwrites.edit(newOwner.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            }).catch(() => {});
        }
    }

    if (data.threadId) {
        const thread = await voiceChannel.guild.channels.fetch(data.threadId).catch(() => null);
        if (thread?.isThread()) await thread.members.add(newOwner.id).catch(() => {});
    }

    data.ownerId = newOwner.id;
    await data.save();
}

async function createTextChat(voiceChannel, data) {
    if (data.textChannelId) {
        const existing = await voiceChannel.guild.channels.fetch(data.textChannelId).catch(() => null);
        if (existing) return { channel: existing, created: false };
    }

    const textPermissions = [
        {
            id: voiceChannel.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: data.ownerId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        }
    ];

    const botMember = voiceChannel.guild.members.me;
    if (botMember) {
        textPermissions.push({
            id: botMember.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        });
    }

    for (const member of voiceChannel.members.values()) {
        if (member.id === data.ownerId || member.id === botMember?.id) continue;
        const canWrite = !data.chatClosed || (data.trustedUserIds || []).includes(member.id);
        const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory];
        if (canWrite) allow.push(PermissionFlagsBits.SendMessages);
        textPermissions.push({
            id: member.id,
            allow,
            ...(canWrite ? {} : { deny: [PermissionFlagsBits.SendMessages] })
        });
    }

    const baseName = voiceChannel.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70) || "sala";

    const textChannel = await voiceChannel.guild.channels.create({
        name: `${baseName}-chat`,
        type: ChannelType.GuildText,
        parent: voiceChannel.parentId,
        permissionOverwrites: textPermissions,
        reason: `Chat temporal para ${voiceChannel.name}`
    });

    data.textChannelId = textChannel.id;
    await data.save();
    return { channel: textChannel, created: true };
}

async function handleModal(interaction) {
    if (!USER_ACTIONS.has(interaction.customId) && ![
        "temp_rename_modal", "temp_limit_modal", "temp_bitrate_modal", "temp_region_modal"
    ].includes(interaction.customId)) return false;

    const room = await getRoom(interaction);
    if (!room) {
        await respond(interaction, "❌ Debes estar en tu canal temporal y ser su propietario.");
        return true;
    }

    const { voiceChannel, data } = room;
    const input = interaction.fields;

    if (interaction.customId === "temp_rename_modal") {
        const submittedName = input.getTextInputValue("temp_rename_input").trim();
        const name = submittedName || `Sala de ${interaction.member.displayName}`;
        await voiceChannel.setName(name);
        data.name = name;
        await data.save();
        if (data.textChannelId) {
            const chat = await interaction.guild.channels.fetch(data.textChannelId).catch(() => null);
            if (chat) await chat.setName(`${name.slice(0, 70)}-chat`).catch(() => {});
        }
        return respond(interaction, `✅ El canal ahora se llama **${name}**.`);
    }

    if (interaction.customId === "temp_limit_modal") {
        const rawLimit = input.getTextInputValue("temp_limit_input").trim();
        const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 0;
        if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
            return respond(interaction, "❌ Escribe un límite entre 0 y 99. Usa 0 para no limitar.");
        }
        await voiceChannel.setUserLimit(limit);
        data.limit = limit;
        await data.save();
        return respond(interaction, `✅ Límite actualizado a **${limit || "sin límite"}**.`);
    }

    if (interaction.customId === "temp_bitrate_modal") {
        const bitrate = Number.parseInt(input.getTextInputValue("temp_bitrate_input"), 10);
        const maxBitrate = voiceChannel.guild.maximumBitrate;
        if (!Number.isInteger(bitrate) || bitrate < 8 || bitrate * 1000 > maxBitrate) {
            return respond(interaction, `❌ El bitrate debe estar entre 8 y ${Math.floor(maxBitrate / 1000)} kbps.`);
        }
        await voiceChannel.setBitrate(bitrate * 1000);
        data.bitrate = bitrate * 1000;
        await data.save();
        return respond(interaction, `✅ Calidad de audio actualizada a **${bitrate} kbps**.`);
    }

    if (interaction.customId === "temp_region_modal") {
        const region = input.getTextInputValue("temp_region_input").trim().toLowerCase();
        const validRegions = ["auto", "brazil", "us-east", "us-west", "singapore", "japan", "rotterdam"];
        if (!validRegions.includes(region)) {
            return respond(interaction, `❌ Región no válida. Opciones: ${validRegions.join(", ")}.`);
        }
        await voiceChannel.setRTCRegion(region === "auto" ? null : region);
        data.region = region;
        await data.save();
        return respond(interaction, `✅ Región actualizada a **${region}**.`);
    }

    const target = await resolveTarget(interaction);
    if (!target) return respond(interaction, "❌ No encontré a ese usuario en el servidor.");
    if (target.id === data.ownerId) return respond(interaction, "❌ No puedes aplicar esa acción al propietario del canal.");

    if (["temp_permit_modal", "temp_invite_modal"].includes(interaction.customId)) {
        await grantAccess(voiceChannel, target);
        let invitationDelivered = false;
        if (interaction.customId === "temp_invite_modal") {
            invitationDelivered = Boolean(await target.send({
                content: `${interaction.user.username} te invitó a su canal de voz temporal: https://discord.com/channels/${interaction.guildId}/${voiceChannel.id}`,
                allowedMentions: { parse: [] }
            }).catch(() => null));
        }
        if (interaction.customId === "temp_invite_modal") {
            return respond(interaction, invitationDelivered
                ? `✅ Se dio acceso a ${target} y se le envió una invitación por mensaje directo.`
                : `✅ Se dio acceso a ${target}, pero no pude enviarle un mensaje directo.`);
        }
        return respond(interaction, `✅ Se permitió el acceso de ${target} a la sala.`);
    }

    if (interaction.customId === "temp_deny_modal") {
        await voiceChannel.permissionOverwrites.edit(target.id, {
            ViewChannel: true,
            Connect: false
        });
        if (target.voice.channelId === voiceChannel.id) {
            await target.voice.disconnect("Se retiró el permiso del canal temporal").catch(() => {});
        }
        return respond(interaction, `✅ Se retiró el permiso de entrada de ${target}.`);
    }

    if (interaction.customId === "temp_kick_modal") {
        if (target.voice.channelId !== voiceChannel.id) {
            return respond(interaction, "❌ Ese usuario no está dentro de tu sala.");
        }
        await target.voice.disconnect("Expulsado por el propietario del canal temporal");
        return respond(interaction, `✅ ${target} fue expulsado de la sala.`);
    }

    if (interaction.customId === "temp_block_modal") {
        await voiceChannel.permissionOverwrites.edit(target.id, {
            ViewChannel: false,
            Connect: false
        });
        if (target.voice.channelId === voiceChannel.id) {
            await target.voice.disconnect("Bloqueado por el propietario del canal temporal").catch(() => {});
        }
        return respond(interaction, `⛔ ${target} fue bloqueado en la sala.`);
    }

    if (interaction.customId === "temp_unblock_modal") {
        await voiceChannel.permissionOverwrites.delete(target.id).catch(() => {});
        return respond(interaction, `✅ Se quitó el bloqueo de ${target}.`);
    }

    if (interaction.customId === "temp_transfer_modal") {
        if (target.user.bot || target.voice.channelId !== voiceChannel.id) {
            return respond(interaction, "❌ El nuevo propietario debe ser una persona conectada a tu sala.");
        }
        await transferOwner(voiceChannel, data, target);
        return respond(interaction, `👑 ${target} ahora es propietario de la sala.`);
    }

    return respond(interaction, "❌ Esta acción no está disponible.");
}

async function handleDeleteConfirmation(interaction) {
    const [action, channelId] = interaction.customId.split(":");
    if (!["temp_delete_confirm", "temp_delete_cancel"].includes(action)) return false;

    if (action === "temp_delete_cancel") {
        await interaction.update({ content: "✅ Eliminación cancelada.", components: [] });
        return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const room = await getRoom(interaction, { channelId });
    if (!room) {
        await respond(interaction, "❌ Ya no eres propietario de este canal temporal.");
        return true;
    }

    const { voiceChannel, data } = room;

    if (data.threadId) {
        const thread = await interaction.guild.channels.fetch(data.threadId).catch(() => null);
        if (thread) await thread.delete("El propietario eliminó su canal temporal");
    }

    if (data.textChannelId) {
        const textChannel = await interaction.guild.channels.fetch(data.textChannelId).catch(() => null);
        if (textChannel) await textChannel.delete("El propietario eliminó su canal temporal");
    }

    if (data.waitingRoomChannelId) {
        const waiting = await interaction.guild.channels.fetch(data.waitingRoomChannelId).catch(() => null);
        if (waiting) await waiting.delete("El propietario eliminó su canal temporal");
    }

    await voiceChannel.delete("El propietario eliminó su canal temporal");
    await tempVoiceChannels.deleteOne({ channelId: voiceChannel.id });
    await interaction.editReply({ content: "🗑️ Tu sala temporal fue eliminada." });
    return true;
}

async function handleDeleteButton(interaction, voiceChannel) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`temp_delete_confirm:${voiceChannel.id}`)
            .setLabel("Sí, eliminar")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`temp_delete_cancel:${voiceChannel.id}`)
            .setLabel("Cancelar")
            .setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({
        content: `¿Seguro que quieres eliminar **${voiceChannel.name}**? Esta acción no se puede deshacer.`,
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        try {
            if (interaction.isModalSubmit()) {
                await handleModal(interaction);
                return;
            }

            if (interaction.isUserSelectMenu() && interaction.customId.startsWith("temp_users:")) {
                await handleUserSelection(interaction);
                return;
            }

            if (interaction.isStringSelectMenu() && interaction.customId === "temp_privacy_select") {
                await handlePrivacySelection(interaction);
                return;
            }

            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
            if (await handleDeleteConfirmation(interaction)) return;

            const action = interaction.isStringSelectMenu()
                ? interaction.values[0]
                : interaction.customId;
            if (!BUTTON_ACTIONS.has(action)) return;

            const room = await getRoom(interaction, { requireOwner: action === "temp_claim" ? false : true });
            if (!room) {
                return respond(interaction, "❌ Debes estar en tu canal temporal y ser su propietario.");
            }

            const { voiceChannel, data } = room;

            const modalButtonActions = new Set([
                "temp_rename", "temp_limit", "temp_bitrate", "temp_region", "temp_transfer"
            ]);
            if (!modalButtonActions.has(action) && action !== "temp_delete") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }

            if (action === "temp_claim") {
                const currentOwner = await interaction.guild.members.fetch(data.ownerId).catch(() => null);
                if (currentOwner?.voice.channelId === voiceChannel.id) {
                    return respond(interaction, "❌ El propietario actual todavía está en la sala.");
                }
                await transferOwner(voiceChannel, data, interaction.member);
                return respond(interaction, "👑 Ahora eres el nuevo propietario de la sala.");
            }

            if (action === "temp_waiting") {
                const { channel, created } = await createWaitingRoom(voiceChannel, data);
                return respond(interaction, created
                    ? `✅ Se creó la sala de espera ${channel} para este canal.`
                    : `ℹ️ La sala de espera de este canal es ${channel}.`);
            }

            if (action === "temp_thread") {
                const { channel, created } = await createRoomThread(voiceChannel, data);
                return respond(interaction, created
                    ? `✅ Se creó el hilo temporal ${channel} para este canal.`
                    : `ℹ️ El hilo temporal de este canal es ${channel}.`);
            }

            if (action === "temp_lock" || action === "temp_unlock" || action === "temp_privacy") {
                data.locked = action === "temp_privacy" ? !data.locked : action === "temp_lock";
                await updateEveryonePermissions(voiceChannel, data);
                await data.save();
                return respond(interaction, data.locked ? "🔒 Privacidad activada: solo podrán entrar las personas autorizadas." : "🔓 Privacidad desactivada.");
            }

            if (action === "temp_hide" || action === "temp_show" || action === "temp_visibility") {
                data.hidden = action === "temp_visibility" ? !data.hidden : action === "temp_hide";
                await updateEveryonePermissions(voiceChannel, data);
                await data.save();
                return respond(interaction, data.hidden ? "👁️ Sala ocultada." : "👁️ Sala visible para el servidor.");
            }

            if (action === "temp_chat") {
                const { channel, created } = await createRoomThread(voiceChannel, data);
                return respond(interaction, created
                    ? `✅ Se creó un hilo temporal para este canal: ${channel}`
                    : `ℹ️ El hilo temporal de este canal es ${channel}.`);
            }

            if (action === "temp_privacy_menu") {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("temp_privacy_select")
                    .setPlaceholder("Elige una opción de privacidad")
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel("Bloquear").setDescription("Solo usuarios confiados podrán unirse").setEmoji("🔒").setValue("lock"),
                        new StringSelectMenuOptionBuilder().setLabel("Desbloquear").setDescription("Todos podrán unirse").setEmoji("🔓").setValue("unlock"),
                        new StringSelectMenuOptionBuilder().setLabel("Invisible").setDescription("Solo usuarios confiados podrán ver la sala").setEmoji("🫥").setValue("hide"),
                        new StringSelectMenuOptionBuilder().setLabel("Visible").setDescription("Todos podrán ver la sala").setEmoji("👁️").setValue("show"),
                        new StringSelectMenuOptionBuilder().setLabel("Chat cerrado").setDescription("Solo usuarios confiados podrán escribir en el chat").setEmoji("💬").setValue("chat_closed"),
                        new StringSelectMenuOptionBuilder().setLabel("Chat abierto").setDescription("Todos los miembros de la sala podrán escribir en el chat").setEmoji("🗨️").setValue("chat_open")
                    );
                return interaction.editReply({
                    content: "Elige una opción de privacidad:",
                    components: [new ActionRowBuilder().addComponents(menu)]
                });
            }

            if (action === "temp_rename") {
                return openTextModal(interaction, {
                    customId: "temp_rename_modal",
                    title: "Cambiar nombre de la sala",
                    inputId: "temp_rename_input",
                    label: "Nuevo nombre",
                    placeholder: "Vacío para restablecer el nombre",
                    maxLength: 30,
                    required: false
                });
            }

            if (action === "temp_limit") {
                return openTextModal(interaction, {
                    customId: "temp_limit_modal",
                    title: "Cambiar límite de usuarios",
                    inputId: "temp_limit_input",
                    label: "Límite entre 0 y 99",
                    placeholder: "Vacío para quitar el límite",
                    maxLength: 2,
                    required: false
                });
            }

            if (action === "temp_bitrate") {
                return openTextModal(interaction, {
                    customId: "temp_bitrate_modal",
                    title: "Cambiar calidad de audio",
                    inputId: "temp_bitrate_input",
                    label: `Bitrate en kbps (máximo ${Math.floor(voiceChannel.guild.maximumBitrate / 1000)})`,
                    placeholder: "64, 96 o 128",
                    maxLength: 4
                });
            }

            if (action === "temp_region") {
                return openTextModal(interaction, {
                    customId: "temp_region_modal",
                    title: "Cambiar región de voz",
                    inputId: "temp_region_input",
                    label: "Región (o auto)",
                    placeholder: "auto, us-east, brazil...",
                    maxLength: 20
                });
            }

            if (["temp_trust", "temp_untrust", "temp_permit", "temp_deny", "temp_invite", "temp_kick", "temp_block", "temp_unblock_user"].includes(action)) {
                const pickerAction = ({
                    temp_trust: "trust", temp_permit: "trust",
                    temp_untrust: "untrust", temp_deny: "untrust",
                    temp_invite: "invite", temp_kick: "kick",
                    temp_block: "block", temp_unblock_user: "unblock"
                })[action];
                return interaction.editReply({
                    content: `Selecciona uno o varios usuarios para ${pickerAction === "trust" ? "darles acceso de confianza" : pickerAction === "untrust" ? "quitarles la confianza" : pickerAction === "unblock" ? "desbloquearlos" : pickerAction === "block" ? "bloquearlos" : pickerAction === "kick" ? "expulsarlos" : "invitarlos"}.`,
                    components: [createUserPicker(pickerAction, voiceChannel.id)]
                });
            }

            if (action === "temp_transfer") {
                return openUserModal(interaction, {
                    customId: "temp_transfer_modal",
                    title: "Transferir propiedad",
                    label: "ID del nuevo propietario"
                });
            }

            if (action === "temp_delete") {
                return handleDeleteButton(interaction, voiceChannel);
            }
        } catch (error) {
            console.error("[TempVoice] Error al procesar una acción:", error);
            if (interaction.isRepliable()) {
                await respond(interaction, "❌ No se pudo completar la acción. Comprueba los permisos del bot y vuelve a intentarlo.").catch(() => {});
            }
        }
    }
};
