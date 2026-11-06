const crypto = require("node:crypto");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");
const CommunityPanel = require("../../Models/CommunityPanel");
const VerificationRequest = require("../../Models/VerificationRequest");
const { recordSelfRoleSelection } = require("../../Functions/selfRoleAchievementMetrics");
const { recordVerifiedMember } = require("../../Functions/verificationAchievementMetrics");

function canAssignRole(guild, role) {
    const botMember = guild.members.me;
    return Boolean(role && role.id !== guild.id && !role.managed &&
        botMember?.permissions.has(PermissionFlagsBits.ManageRoles) &&
        role.position < botMember.roles.highest.position);
}

function answerHash(value) {
    return crypto.createHash("sha256").update(String(value || "").normalize("NFKC").trim().toLocaleLowerCase("es")).digest("hex");
}

function safeEqual(left, right) {
    const a = Buffer.from(String(left || ""), "hex");
    const b = Buffer.from(String(right || ""), "hex");
    return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

async function completeVerification(guild, member, panel, user) {
    const role = guild.roles.cache.get(panel.verificationRoleId);
    if (!canAssignRole(guild, role)) throw new Error("No puedo asignar el rol de verificación. Revisa Gestionar roles y la jerarquía.");
    if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, "Verificación completada desde un panel de Bryvex Bot");
    }
    const removeRoles = (panel.removeRoleIds || []).filter(id => id !== role.id)
        .map(id => guild.roles.cache.get(id)).filter(item => canAssignRole(guild, item));
    if (removeRoles.length) await member.roles.remove(removeRoles, "Retirar roles previos tras verificar");
    await recordVerifiedMember(guild, user, panel.panelId)
        .catch(error => console.warn("[Community Panels] No se pudo sincronizar verified:", error.message));
}

function buildVerificationModal(panel, method, challengeText) {
    const label = method === "captcha" ? challengeText : String(panel.verificationQuestion || "").slice(0, 45);
    const modal = new ModalBuilder()
        .setCustomId(`community-verify:${panel.panelId}:${method}`)
        .setTitle(method === "captcha" ? "Comprobación CAPTCHA" : "Verificación");
    const answer = new TextInputBuilder()
        .setCustomId("answer")
        .setLabel(label || "Escribe tu respuesta")
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(100)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(answer));
    return modal;
}

async function handleVerificationButton(interaction, panel, method) {
    const methods = panel.verificationMethods?.length ? panel.verificationMethods : ["button"];
    if (!methods.includes(method)) {
        return interaction.reply({ content: "Este método no está habilitado en el panel.", flags: MessageFlags.Ephemeral });
    }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (member.roles.cache.has(panel.verificationRoleId)) {
        return interaction.reply({ content: "Tu cuenta ya está verificada.", flags: MessageFlags.Ephemeral });
    }
    if (method === "button") {
        await completeVerification(interaction.guild, member, panel, interaction.user);
        return interaction.reply({ content: "✅ Verificación completada correctamente.", flags: MessageFlags.Ephemeral });
    }
    if (method === "captcha" || method === "question") {
        if (method === "question" && !panel.verificationQuestion) {
            return interaction.reply({ content: "La pregunta de verificación no está configurada. Contacta con el equipo.", flags: MessageFlags.Ephemeral });
        }
        let expected;
        let challengeText = "";
        if (method === "captcha") {
            const left = crypto.randomInt(2, 10);
            const right = crypto.randomInt(2, 10);
            expected = String(left + right);
            challengeText = `Resuelve: ${left} + ${right} = ?`;
        } else {
            expected = panel.verificationAnswerHash;
        }
        const recentChallenge = await VerificationRequest.findOne({
            guildId: interaction.guild.id, panelId: panel.panelId, userId: interaction.user.id, method,
            createdAt: { $gt: new Date(Date.now() - 20_000) }
        }).select("_id");
        if (recentChallenge) {
            return interaction.reply({ content: "Espera 20 segundos antes de solicitar otra comprobación.", flags: MessageFlags.Ephemeral });
        }
        await VerificationRequest.deleteMany({ guildId: interaction.guild.id, panelId: panel.panelId, userId: interaction.user.id, method, status: "challenge" });
        await VerificationRequest.create({
            guildId: interaction.guild.id, panelId: panel.panelId, userId: interaction.user.id, method,
            status: "challenge", answerHash: method === "captcha" ? answerHash(expected) : null,
            expiresAt: new Date(Date.now() + 5 * 60_000)
        });
        if (method === "question") {
            return interaction.showModal(buildVerificationModal(panel, method, panel.verificationQuestion));
        }
        return interaction.showModal(buildVerificationModal(panel, method, challengeText));
    }
    if (method === "manual_approval") {
        if (!panel.reviewChannelId) return interaction.reply({ content: "El canal de revisión no está configurado. Contacta con el equipo.", flags: MessageFlags.Ephemeral });
        const existing = await VerificationRequest.findOne({
            guildId: interaction.guild.id, panelId: panel.panelId, userId: interaction.user.id,
            method, status: "pending", expiresAt: { $gt: new Date() }
        });
        if (existing) return interaction.reply({ content: "Ya tienes una solicitud pendiente de revisión.", flags: MessageFlags.Ephemeral });
        const channel = await interaction.guild.channels.fetch(panel.reviewChannelId).catch(() => null);
        if (!channel?.isTextBased() || !channel.send) {
            return interaction.reply({ content: "No puedo acceder al canal de revisión configurado.", flags: MessageFlags.Ephemeral });
        }
        const request = await VerificationRequest.create({
            guildId: interaction.guild.id, panelId: panel.panelId, userId: interaction.user.id,
            method, status: "pending", expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000)
        });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`community-review:${request.id}:approve`).setLabel("Aprobar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`community-review:${request.id}:reject`).setLabel("Rechazar").setStyle(ButtonStyle.Danger)
        );
        try {
            const message = await channel.send({
                content: `Solicitud de verificación de <@${interaction.user.id}> en el panel **${panel.name}**. ID: ${request.id}`,
                components: [row], allowedMentions: { users: [interaction.user.id] }
            });
            request.reviewMessageId = message.id;
            request.reviewChannelId = channel.id;
            await request.save();
        } catch (error) {
            await VerificationRequest.deleteOne({ _id: request._id });
            throw error;
        }
        return interaction.reply({ content: "📨 Tu solicitud fue enviada al equipo de moderación. Te avisaremos cuando sea revisada.", flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: "Método de verificación desconocido.", flags: MessageFlags.Ephemeral });
}

async function handleModal(interaction) {
    const match = interaction.customId.match(/^community-verify:([a-z0-9_-]{1,40}):(captcha|question)$/i);
    if (!match || !interaction.guild) return false;
    const [, panelId, method] = match;
    const panel = await CommunityPanel.findOne({ guildId: interaction.guild.id, panelId: panelId.toLowerCase(), kind: "verification", enabled: true }).select("+verificationAnswerHash").lean();
    if (!panel) {
        await interaction.reply({ content: "Este panel ya no está activo.", flags: MessageFlags.Ephemeral });
        return true;
    }
    const request = await VerificationRequest.findOne({
        guildId: interaction.guild.id, panelId: panel.panelId, userId: interaction.user.id,
        method, status: "challenge", expiresAt: { $gt: new Date() }
    }).select("+answerHash");
    if (!request) {
        await interaction.reply({ content: "La comprobación expiró. Vuelve a pulsar el botón del panel.", flags: MessageFlags.Ephemeral });
        return true;
    }
    const submitted = answerHash(interaction.fields.getTextInputValue("answer"));
    const expectedHash = method === "question" ? panel.verificationAnswerHash : request.answerHash;
    if (!expectedHash || !safeEqual(submitted, expectedHash)) {
        request.status = "expired";
        await request.save();
        await interaction.reply({ content: "❌ Respuesta incorrecta. Vuelve a intentarlo desde el panel.", flags: MessageFlags.Ephemeral });
        return true;
    }
    request.status = "approved";
    await request.save();
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await completeVerification(interaction.guild, member, panel, interaction.user);
    await interaction.reply({ content: "✅ Verificación completada correctamente.", flags: MessageFlags.Ephemeral });
    return true;
}

async function handleReview(interaction) {
    const match = interaction.customId.match(/^community-review:([a-f0-9]{24}):(approve|reject)$/i);
    if (!match || !interaction.guild) return false;
    const [, requestId, action] = match;
    const request = await VerificationRequest.findOne({ _id: requestId, guildId: interaction.guild.id, method: "manual_approval", status: "pending", expiresAt: { $gt: new Date() } });
    if (!request) {
        await interaction.reply({ content: "Esta solicitud ya fue procesada o expiró.", flags: MessageFlags.Ephemeral });
        return true;
    }
    const panel = await CommunityPanel.findOne({ guildId: interaction.guild.id, panelId: request.panelId, kind: "verification", enabled: true });
    if (!panel) {
        await interaction.reply({ content: "El panel asociado ya no está activo.", flags: MessageFlags.Ephemeral });
        return true;
    }
    const reviewer = await interaction.guild.members.fetch(interaction.user.id);
    const allowed = reviewer.permissions.has(PermissionFlagsBits.ManageGuild) ||
        (panel.reviewerRoleIds || []).some(roleId => reviewer.roles.cache.has(roleId));
    if (!allowed) {
        await interaction.reply({ content: "No tienes permiso para revisar estas solicitudes.", flags: MessageFlags.Ephemeral });
        return true;
    }
    request.status = action === "approve" ? "approved" : "rejected";
    request.reviewerId = interaction.user.id;
    await request.save();
    if (action === "approve") {
        const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
        if (member) await completeVerification(interaction.guild, member, panel, member.user);
    }
    await interaction.update({
        content: `Solicitud ${action === "approve" ? "aprobada" : "rechazada"} por <@${interaction.user.id}> · <@${request.userId}>`,
        components: []
    });
    const target = await interaction.guild.members.fetch(request.userId).catch(() => null);
    if (target) await target.send(action === "approve"
        ? `Tu solicitud de verificación en **${interaction.guild.name}** fue aprobada.`
        : `Tu solicitud de verificación en **${interaction.guild.name}** fue rechazada. Contacta con el equipo si necesitas ayuda.`).catch(() => {});
    return true;
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if (interaction.isModalSubmit()) {
            try { await handleModal(interaction); } catch (error) {
                console.error("[Community Panels] Error en modal de verificación:", error);
                if (!interaction.replied) await interaction.reply({ content: "No pude validar tu respuesta. Inténtalo de nuevo.", flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            return;
        }
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
        if (!interaction.guild) return;
        const reviewMatch = interaction.customId.match(/^community-review:/);
        if (reviewMatch) {
            try { await handleReview(interaction); } catch (error) {
                console.error("[Community Panels] Error al revisar solicitud:", error);
                if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: "No pude procesar la revisión.", flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            return;
        }
        const match = interaction.customId.match(/^community-panel:([a-z0-9_-]{1,40}):(verify|roles|role)(?::([a-z_]+|\d{17,20}))?$/i);
        if (!match) return;
        try {
            const [, panelId, action, extra] = match;
            const panel = await CommunityPanel.findOne({ guildId: interaction.guild.id, panelId: panelId.toLowerCase(), enabled: true }).lean();
            if (!panel) return interaction.reply({ content: "Este panel ya no está activo o fue eliminado.", flags: MessageFlags.Ephemeral });
            if (action === "verify") {
                return handleVerificationButton(interaction, panel, extra || "button");
            }
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (panel.kind !== "self_roles") return interaction.reply({ content: "Este panel no permite reclamar roles.", flags: MessageFlags.Ephemeral });
            const configuredRoles = new Map((panel.roles || []).map(item => [item.roleId, item]));
            const requestedIds = action === "role" ? [extra] : interaction.values;
            if (!Array.isArray(requestedIds) || !requestedIds.length || requestedIds.some(id => !configuredRoles.has(id))) {
                return interaction.reply({ content: "La selección contiene un rol que no pertenece a este panel.", flags: MessageFlags.Ephemeral });
            }
            const roles = requestedIds.map(id => interaction.guild.roles.cache.get(id));
            if (roles.some(role => !canAssignRole(interaction.guild, role))) {
                return interaction.reply({ content: "No puedo asignar uno de los roles seleccionados. Revisa los permisos y la jerarquía del bot.", flags: MessageFlags.Ephemeral });
            }
            const missingRoles = roles.filter(role => !member.roles.cache.has(role.id));
            if (!missingRoles.length) return interaction.reply({ content: "Ya tienes todos los roles seleccionados.", flags: MessageFlags.Ephemeral });
            await member.roles.add(missingRoles, "Rol voluntario reclamado desde un panel de Bryvex Bot");
            for (const role of missingRoles) {
                await recordSelfRoleSelection(interaction.guild, interaction.user, role.id)
                    .catch(error => console.warn("[Community Panels] No se pudo sincronizar self_roles_taken:", error.message));
            }
            return interaction.reply({ content: `✅ Roles reclamados: ${missingRoles.map(role => role.name).join(", ")}.`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error("[Community Panels] Error procesando una interacción:", error);
            const response = { content: error.message || "No pude completar la acción. Revisa los permisos del bot e inténtalo otra vez.", flags: MessageFlags.Ephemeral };
            if (interaction.replied || interaction.deferred) return interaction.followUp(response).catch(() => {});
            return interaction.reply(response).catch(() => {});
        }
    }
};
