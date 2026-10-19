const { PermissionFlagsBits } = require("discord.js");
const logsSchema = require("../Models/logsSchema");
const InviteTracker = require("../Models/InviteTracker");

const inviteCache = new Map();

async function initializeGuildInviteCache(guild) {
    try {
        const me = guild.members.me || await guild.members.fetchMe();
        if (!me.permissions.has(PermissionFlagsBits.ManageGuild)) {
            console.warn(`[INVITE TRACKER] Falta el permiso Gestionar servidor en ${guild.name} (${guild.id}).`);
            inviteCache.delete(guild.id);
            return false;
        }

        const invites = await guild.invites.fetch();
        inviteCache.set(guild.id, new Map(
            invites.map(invite => [invite.code, {
                uses: invite.uses ?? 0,
                inviterId: invite.inviter?.id ?? null
            }])
        ));
        return true;
    } catch (error) {
        console.warn(`[INVITE TRACKER] No se pudieron obtener las invitaciones de ${guild.name} (${guild.id}): ${error.message}`);
        return false;
    }
}

async function initializeInviteCache(client) {
    for (const guild of client.guilds.cache.values()) {
        await initializeGuildInviteCache(guild);
    }
}

async function handleMemberJoin(member) {
    const guild = member.guild;
    let config;
    try {
        config = await logsSchema.findOne({ Guild: guild.id });
    } catch (error) {
        console.error(`[INVITE TRACKER] No se pudo leer la configuración de ${guild.id}:`, error);
        return;
    }
    if (!config || config.InviteTrackerEnabled !== true || !config.InviteTrackerChannel) {
        // Mantiene actualizada la caché mientras el sistema está apagado para evitar atribuciones erróneas al reactivarlo.
        await initializeGuildInviteCache(guild);
        return;
    }

    let usedInvite = null;
    let attributionAvailable = false;

    try {
        const me = guild.members.me || await guild.members.fetchMe();
        if (!me.permissions.has(PermissionFlagsBits.ManageGuild)) {
            console.warn(`[INVITE TRACKER] Falta el permiso Gestionar servidor en ${guild.name} (${guild.id}).`);
        } else {
            const previousInvites = inviteCache.get(guild.id);
            const currentInvites = await guild.invites.fetch();

            if (previousInvites) {
                const increased = currentInvites
                    .map(invite => ({
                        invite,
                        difference: (invite.uses ?? 0) - (previousInvites.get(invite.code)?.uses ?? 0)
                    }))
                    .filter(item => item.difference > 0)
                    .sort((a, b) => b.difference - a.difference);

                if (increased.length) {
                    usedInvite = increased[0].invite;
                    attributionAvailable = Boolean(usedInvite.inviter?.id);
                }
            }

            inviteCache.set(guild.id, new Map(
                currentInvites.map(invite => [invite.code, {
                    uses: invite.uses ?? 0,
                    inviterId: invite.inviter?.id ?? null
                }])
            ));
        }
    } catch (error) {
        console.warn(`[INVITE TRACKER] Error detectando la invitación usada en ${guild.name}: ${error.message}`);
    }

    const inviter = attributionAvailable ? usedInvite.inviter : null;
    let totalInvites = null;

    if (inviter) {
        try {
            const tracker = await InviteTracker.findOneAndUpdate(
                { guildId: guild.id, inviterId: inviter.id },
                {
                    $inc: { invites: 1 },
                    $set: { lastInvitedAt: new Date() },
                    $setOnInsert: { guildId: guild.id, inviterId: inviter.id }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            totalInvites = tracker.invites;
        } catch (error) {
            console.error(`[INVITE TRACKER] No se pudo guardar el contador de ${inviter.id} en ${guild.id}:`, error);
        }
    }

    try {
        const channel = guild.channels.cache.get(config.InviteTrackerChannel);
        if (!channel?.isTextBased()) return;

        const permissions = channel.permissionsFor(guild.members.me);
        if (!permissions?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
        ])) return;

        const invitedUser = `<@${member.id}>`;
        const inviterText = inviter ? `<@${inviter.id}>` : "¿?";
        const inviteCountText = inviter ? String(totalInvites ?? "no disponible") : "no disponible";
        const message = `**${invitedUser}** 𝘍𝘶𝘦 𝘪𝘯𝘷𝘪𝘵𝘢𝘥𝘰 𝘱𝘰𝘳 ${inviterText} 𝘈𝘩𝘰𝘳𝘢 𝘵𝘪𝘦𝘯𝘦 ${inviteCountText} invites.`;
        await channel.send({ content: message });
    } catch (error) {
        console.error(`[INVITE TRACKER] No se pudo enviar el log de entrada en ${guild.id}:`, error);
    }
}

module.exports = {
    initializeInviteCache,
    initializeGuildInviteCache,
    handleMemberJoin
};
