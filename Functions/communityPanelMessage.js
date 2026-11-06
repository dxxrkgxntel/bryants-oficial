const COMPONENTS_V2_FLAG = 1 << 15;

function parsePanelEmoji(value) {
    const emoji = String(value || "").trim();
    if (!emoji) return null;
    const custom = emoji.match(/^<(a?):([^:>]+):(\d{17,20})>$/);
    if (custom) return { id: custom[3], name: custom[2], animated: Boolean(custom[1]) };
    return { name: emoji };
}

function buildPanelControls(panel, guild) {
    if (panel.kind === "verification") {
        const methods = Array.isArray(panel.verificationMethods) && panel.verificationMethods.length
            ? panel.verificationMethods
            : ["button"];
        const labels = {
            button: { label: panel.verifyLabel || "Verificarme", style: 3, emoji: panel.verifyEmoji },
            captcha: { label: "Resolver CAPTCHA", style: 2 },
            question: { label: "Responder pregunta", style: 2 },
            manual_approval: { label: "Solicitar verificación", style: 1 }
        };
        const buttons = methods.slice(0, 4).map(method => {
            const config = labels[method];
            if (!config) return null;
            const button = {
                type: 2,
                style: config.style,
                custom_id: `community-panel:${panel.panelId}:verify:${method}`,
                label: String(config.label).slice(0, 80)
            };
            const emoji = parsePanelEmoji(config.emoji);
            if (emoji) button.emoji = emoji;
            return button;
        }).filter(Boolean);
        return buttons.length ? [{ type: 1, components: buttons }] : [];
    }

    const roles = (Array.isArray(panel.roles) ? panel.roles : []).filter(item => {
        const role = guild?.roles?.cache?.get(item.roleId);
        return role && !role.managed && role.id !== guild.id;
    });
    if (!roles.length) return [];

    if (panel.controlType === "select") {
        const options = roles.slice(0, 25).map(item => {
            const option = { label: item.label, value: item.roleId };
            if (item.description) option.description = item.description;
            const emoji = parsePanelEmoji(item.emoji);
            if (emoji) option.emoji = emoji;
            return option;
        });
        return [{
            type: 1,
            components: [{
                type: 3,
                custom_id: `community-panel:${panel.panelId}:roles`,
                placeholder: String(panel.selectPlaceholder || "Selecciona tus roles").slice(0, 150),
                min_values: 1,
                max_values: Math.max(1, Math.min(options.length, 25, Number(panel.maxValues) || 1)),
                options
            }]
        }];
    }

    const rows = [];
    for (let index = 0; index < roles.length; index += 5) {
        const buttons = roles.slice(index, index + 5).map(item => {
            const button = {
                type: 2,
                style: 2,
                custom_id: `community-panel:${panel.panelId}:role:${item.roleId}`,
                label: item.label.slice(0, 80)
            };
            const emoji = parsePanelEmoji(item.emoji);
            if (emoji) button.emoji = emoji;
            return button;
        });
        rows.push({ type: 1, components: buttons });
    }
    return rows;
}

function buildCommunityPanelPayload(panel, guild) {
    if (!panel || !guild?.id) throw new TypeError("A community panel and guild are required.");
    const controls = buildPanelControls(panel, guild);
    const content = String(panel.content || "").slice(0, 2000);
    const title = String(panel.title || "").slice(0, 256);
    const description = String(panel.description || "").slice(0, 4000);
    const color = /^#[0-9a-f]{6}$/i.test(panel.color || "") ? Number.parseInt(panel.color.slice(1), 16) : 0x8A2BE2;

    if (panel.messageType === "components_v2") {
        const components = [];
        if (title) components.push({ type: 10, content: `## ${title}` });
        if (description) components.push({ type: 10, content: description });
        if (content) components.push({ type: 10, content });
        if (panel.imageUrl) components.push({ type: 12, items: [{ media: { url: panel.imageUrl } }] });
        if (panel.thumbnailUrl && !panel.imageUrl) components.push({ type: 12, items: [{ media: { url: panel.thumbnailUrl } }] });
        components.push(...controls);
        if (!components.length) throw new Error("Añade texto, título, imagen o controles al mensaje.");
        const container = { type: 17, components, accent_color: color };
        return { flags: COMPONENTS_V2_FLAG, components: [container], allowed_mentions: { parse: [] } };
    }

    const payload = { allowed_mentions: { parse: [] } };
    if (panel.messageType === "text") {
        const textContent = [title, description, content].filter(Boolean).join("\n\n").slice(0, 2000);
        if (textContent) payload.content = textContent;
    } else if (content) {
        payload.content = content;
    }
    if (panel.messageType === "embed" && (title || description || panel.imageUrl || panel.thumbnailUrl)) {
        const embed = { color };
        if (title) embed.title = title;
        if (description) embed.description = description;
        if (panel.imageUrl) embed.image = { url: panel.imageUrl };
        if (panel.thumbnailUrl) embed.thumbnail = { url: panel.thumbnailUrl };
        payload.embeds = [embed];
    }
    if (controls.length) payload.components = controls;
    if (!payload.content && !payload.embeds?.length && !payload.components?.length) {
        throw new Error("Añade contenido o controles antes de generar el mensaje.");
    }
    return payload;
}

module.exports = { COMPONENTS_V2_FLAG, buildPanelControls, buildCommunityPanelPayload };
