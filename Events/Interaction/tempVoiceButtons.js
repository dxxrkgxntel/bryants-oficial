const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ModalBuilder,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require("discord.js");
const tempVoiceChannels = require("../../Models/tempVoiceChannels");

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
    "temp_rename", "temp_limit", "temp_bitrate", "temp_region",
    "temp_claim", "temp_transfer", "temp_delete", "temp_kick",
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

async function openTextModal(interaction, { customId, title, inputId, label, placeholder, maxLength = 100 }) {
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
                    .setRequired(true)
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
        await voiceChannel.permissionOverwrites.edit(previousOwnerId, {
            ViewChannel: null,
            Connect: null,
            ManageChannels: null,
            MoveMembers: null
        });
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
        textPermissions.push({
            id: member.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
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
        const name = input.getTextInputValue("temp_rename_input").trim();
        if (!name) return respond(interaction, "❌ El nombre no puede estar vacío.");
        await voiceChannel.setName(name);
        if (data.textChannelId) {
            const chat = await interaction.guild.channels.fetch(data.textChannelId).catch(() => null);
            if (chat) await chat.setName(`${name.slice(0, 70)}-chat`).catch(() => {});
        }
        return respond(interaction, `✅ El canal ahora se llama **${name}**.`);
    }

    if (interaction.customId === "temp_limit_modal") {
        const limit = Number.parseInt(input.getTextInputValue("temp_limit_input"), 10);
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

    if (data.textChannelId) {
        const textChannel = await interaction.guild.channels.fetch(data.textChannelId).catch(() => null);
        if (textChannel) await textChannel.delete("El propietario eliminó su canal temporal");
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
                "temp_rename", "temp_limit", "temp_bitrate", "temp_region",
                "temp_permit", "temp_deny", "temp_invite", "temp_kick",
                "temp_block", "temp_unblock_user", "temp_transfer"
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

            if (action === "temp_lock" || action === "temp_unlock" || action === "temp_privacy") {
                data.locked = action === "temp_privacy" ? !data.locked : action === "temp_lock";
                await updateEveryonePermissions(voiceChannel, data);
                await data.save();
                return respond(interaction, data.locked ? "🔒 Privacidad activada: solo podrán entrar las personas autorizadas." : "🔓 Privacidad desactivada.");
            }

            if (action === "temp_waiting") {
                data.waitingRoom = !data.waitingRoom;
                await updateEveryonePermissions(voiceChannel, data);
                await data.save();
                return respond(interaction, data.waitingRoom
                    ? "🕒 Sala de espera activada. Los usuarios podrán ver la sala, pero necesitarán autorización para entrar."
                    : "✅ Sala de espera desactivada.");
            }

            if (action === "temp_hide" || action === "temp_show" || action === "temp_visibility") {
                data.hidden = action === "temp_visibility" ? !data.hidden : action === "temp_hide";
                await updateEveryonePermissions(voiceChannel, data);
                await data.save();
                return respond(interaction, data.hidden ? "👁️ Sala ocultada." : "👁️ Sala visible para el servidor.");
            }

            if (action === "temp_chat") {
                const { channel, created } = await createTextChat(voiceChannel, data);
                return respond(interaction, created ? `💬 Chat creado: ${channel}` : `💬 El chat de la sala es ${channel}.`);
            }

            if (action === "temp_rename") {
                return openTextModal(interaction, {
                    customId: "temp_rename_modal",
                    title: "Cambiar nombre de la sala",
                    inputId: "temp_rename_input",
                    label: "Nuevo nombre",
                    placeholder: "Ejemplo: Sala de Bryant",
                    maxLength: 30
                });
            }

            if (action === "temp_limit") {
                return openTextModal(interaction, {
                    customId: "temp_limit_modal",
                    title: "Cambiar límite de usuarios",
                    inputId: "temp_limit_input",
                    label: "Límite entre 0 y 99",
                    placeholder: "0 significa sin límite",
                    maxLength: 2
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

            if (action === "temp_permit" || action === "temp_deny" || action === "temp_invite" ||
                action === "temp_kick" || action === "temp_block" || action === "temp_unblock_user") {
                const modalOptions = {
                    temp_permit: ["temp_permit_modal", "Permitir acceso", "ID del usuario"],
                    temp_deny: ["temp_deny_modal", "Quitar acceso", "ID del usuario"],
                    temp_invite: ["temp_invite_modal", "Invitar a la sala", "ID del usuario"],
                    temp_kick: ["temp_kick_modal", "Expulsar de la sala", "ID del usuario"],
                    temp_block: ["temp_block_modal", "Bloquear usuario", "ID del usuario"],
                    temp_unblock_user: ["temp_unblock_modal", "Desbloquear usuario", "ID del usuario"]
                }[action];
                return openUserModal(interaction, {
                    customId: modalOptions[0],
                    title: modalOptions[1],
                    label: modalOptions[2]
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
