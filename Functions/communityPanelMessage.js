const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

function parsePanelEmoji(value) {
    const emoji = String(value || "").trim();
    if (!emoji) return null;
    const custom = emoji.match(/^<(a?):([^:>]+):(\d{17,20})>$/);
    if (custom) return { id: custom[3], name: custom[2], animated: Boolean(custom[1]) };
    return { name: emoji };
}

function buildPanelControls(panel, guild) {
    if (panel.kind === "verification") {
        const button = new ButtonBuilder()
            .setCustomId(`community-panel:${panel.panelId}:verify`)
            .setLabel(String(panel.verifyLabel || "Verificarme").slice(0, 80))
            .setStyle(ButtonStyle.Success);
        if (panel.verifyEmoji) button.setEmoji(parsePanelEmoji(panel.verifyEmoji));
        return [new ActionRowBuilder().addComponents(button).toJSON()];
    }

    const roles = (Array.isArray(panel.roles) ? panel.roles : []).filter(item => {
        const role = guild?.roles?.cache?.get(item.roleId);
        return role && !role.managed && role.id !== guild.id;
    });
    if (!roles.length) return [];

    if (panel.controlType === "select") {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`community-panel:${panel.panelId}:roles`)
            .setPlaceholder(String(panel.selectPlaceholder || "Selecciona tus roles").slice(0, 150))
            .setMinValues(1)
            .setMaxValues(Math.max(1, Math.min(25, Number(panel.maxValues) || 1)));
        menu.addOptions(roles.slice(0, 25).map(item => {
            const option = { label: item.label, value: item.roleId };
            if (item.description) option.description = item.description;
            if (item.emoji) option.emoji = parsePanelEmoji(item.emoji);
            return option;
        }));
        return [new ActionRowBuilder().addComponents(menu).toJSON()];
    }

    const rows = [];
    for (let index = 0; index < roles.length; index += 5) {
        const row = new ActionRowBuilder();
        for (const item of roles.slice(index, index + 5)) {
            const button = new ButtonBuilder()
                .setCustomId(`community-panel:${panel.panelId}:role:${item.roleId}`)
                .setLabel(item.label.slice(0, 80))
                .setStyle(ButtonStyle.Secondary);
            if (item.emoji) button.setEmoji(parsePanelEmoji(item.emoji));
            row.addComponents(button);
        }
        rows.push(row.toJSON());
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
        if (panel.imageUrl) components.push({ type: 12, items: [{ media: { url: panel.imageUrl } }] });
        if (panel.thumbnailUrl && !panel.imageUrl) components.push({ type: 12, items: [{ media: { url: panel.thumbnailUrl } }] });
        components.push(...controls);
        if (!components.length && content) components.push({ type: 10, content });
        if (!components.length) throw new Error("Añade texto, título, imagen o controles al mensaje.");
        const container = { type: 17, components };
        if (color !== null) container.accent_color = color;
        return { flags: MessageFlags.IsComponentsV2, components: [container], allowedMentions: { parse: [] } };
    }

    const payload = { allowedMentions: { parse: [] } };
    if (content) payload.content = content;
    if (panel.messageType === "embed" && (title || description || panel.imageUrl || panel.thumbnailUrl)) {
        const embed = new EmbedBuilder().setColor(color);
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (panel.imageUrl) embed.setImage(panel.imageUrl);
        if (panel.thumbnailUrl) embed.setThumbnail(panel.thumbnailUrl);
        payload.embeds = [embed.toJSON()];
    }
    if (controls.length) payload.components = controls;
    if (!payload.content && !payload.embeds?.length && !payload.components?.length) {
        throw new Error("Añade contenido o controles antes de generar el mensaje.");
    }
    return payload;
}

module.exports = { buildPanelControls, buildCommunityPanelPayload };
