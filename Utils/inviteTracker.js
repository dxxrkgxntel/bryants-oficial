const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
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
        const config = await logsSchema.findOne({ Guild: guild.id });
        if (!config || config.Enabled === false || !config.Channel) return;

        const channel = guild.channels.cache.get(config.Channel);
        if (!channel?.isTextBased()) return;

        const permissions = channel.permissionsFor(guild.members.me);
        if (!permissions?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks
        ])) return;

        const embed = new EmbedBuilder()
            .setColor("#8A2BE2")
            .setTitle("📨 Invitación utilizada")
            .setDescription(`${member} se ha unido al servidor.`)
            .addFields(
                { name: "👤 Usuario", value: `${member.user.tag || member.user.username} (\`${member.id}\`)`, inline: false },
                { name: "🔗 Invitado por", value: inviter ? `${inviter}` : "No se pudo determinar (invitación personalizada, caché o permisos)", inline: true },
                { name: "📊 Invitaciones acumuladas", value: inviter ? String(totalInvites ?? "No disponible") : "No disponible", inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setImage("https://i.imgur.com/joAe57D.png")
            .setTimestamp();

        if (usedInvite?.code) {
            embed.addFields({ name: "Código utilizado", value: `\`${usedInvite.code}\``, inline: true });
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[INVITE TRACKER] No se pudo enviar el log de entrada en ${guild.id}:`, error);
    }
}

module.exports = {
    initializeInviteCache,
    initializeGuildInviteCache,
    handleMemberJoin
};
