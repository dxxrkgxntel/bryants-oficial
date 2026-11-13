const COMPONENTS_V2_FLAG = 1 << 15;

function text(value, max) {
    return String(value ?? "").trim().slice(0, max);
}

function httpsUrl(value, label) {
    if (!value) return null;
    let url;
    try { url = new URL(String(value)); } catch { throw new Error(label + " debe ser una URL válida."); }
    if (url.protocol !== "https:") throw new Error(label + " debe comenzar con https://.");
    return url.toString().slice(0, 500);
}

function validateMessageDraft(input, channels) {
    const name = text(input?.name, 80);
    const channelId = String(input?.channelId || "");
    const format = input?.format;
    if (!name) throw new Error("Escribe un nombre para guardar el mensaje.");
    if (!channels.some(channel => channel.id === channelId && [0, 5].includes(channel.type))) throw new Error("Selecciona un canal de texto de este servidor.");
    if (!["embed", "components_v2"].includes(format)) throw new Error("Selecciona Embed o Components V2.");
    const source = input?.payload && typeof input.payload === "object" ? input.payload : {};
    if (format === "embed") {
        const embed = {
            title: text(source.title, 256),
            description: text(source.description, 4096),
            color: /^#[0-9a-f]{6}$/i.test(source.color || "") ? Number.parseInt(source.color.slice(1), 16) : 0x8A2BE2
        };
        const url = httpsUrl(source.url, "El enlace del título");
        if (url) embed.url = url;
        const authorName = text(source.authorName, 256);
        const authorUrl = httpsUrl(source.authorUrl, "El enlace del autor");
        const authorIcon = httpsUrl(source.authorIcon, "El icono del autor");
        if (authorName) embed.author = { name: authorName, ...(authorUrl ? { url: authorUrl } : {}), ...(authorIcon ? { icon_url: authorIcon } : {}) };
        const footerText = text(source.footerText, 2048);
        const footerIcon = httpsUrl(source.footerIcon, "El icono del pie");
        if (footerText) embed.footer = { text: footerText, ...(footerIcon ? { icon_url: footerIcon } : {}) };
        const image = httpsUrl(source.image, "La imagen");
        const thumbnail = httpsUrl(source.thumbnail, "La miniatura");
        if (image) embed.image = { url: image };
        if (thumbnail) embed.thumbnail = { url: thumbnail };
        embed.timestamp = source.timestamp === true;
        const fields = Array.isArray(source.fields) ? source.fields.slice(0, 25).map(field => ({
            name: text(field?.name, 256),
            value: text(field?.value, 1024),
            inline: field?.inline === true
        })).filter(field => field.name && field.value) : [];
        if (fields.length) embed.fields = fields;
        const embedTextLength = [embed.title, embed.description, embed.author?.name, embed.footer?.text, ...fields.flatMap(field => [field.name, field.value])].filter(Boolean).join("").length;
        if (embedTextLength > 6000) throw new Error("El contenido total del embed no puede superar 6000 caracteres.");
        if (!embed.title && !embed.description && !embed.author && !embed.footer && !embed.image && !embed.thumbnail && !fields.length) {
            throw new Error("Añade contenido al embed antes de guardarlo.");
        }
        return { name, channelId, format, payload: { embed } };
    }

    const title = text(source.title, 256);
    const blocks = Array.isArray(source.blocks) ? source.blocks : [];
    if (blocks.length + (title ? 1 : 0) > 10) throw new Error("Components V2 admite hasta 10 componentes dentro del contenedor, incluido el título.");
    const components = [];
    if (title) components.push({ type: 10, content: "# " + title });
    for (const block of blocks) {
        if (block?.type === "text") {
            const content = text(block.content, 4000);
            if (content) components.push({ type: 10, content });
        } else if (block?.type === "separator") {
            components.push({ type: 14, divider: block.divider !== false, spacing: block.spacing === "large" ? 2 : 1 });
        } else if (block?.type === "image") {
            const url = httpsUrl(block.url, "La imagen del componente");
            if (url) components.push({ type: 12, items: [{ media: { url } }] });
        } else if (block?.type === "button") {
            const label = text(block.label, 80);
            const url = httpsUrl(block.url, "El enlace del botón");
            if (label && url) components.push({ type: 1, components: [{ type: 2, style: 5, label, url }] });
        } else {
            throw new Error("Hay un bloque de Components V2 no válido.");
        }
    }
    if (!components.length) throw new Error("Añade al menos un bloque a Components V2.");
    return {
        name, channelId, format,
        payload: { title, accentColor: /^#[0-9a-f]{6}$/i.test(source.accentColor || "") ? Number.parseInt(source.accentColor.slice(1), 16) : 0x8A2BE2, blocks: blocks.map(block => ({ type: block.type, content: text(block.content, 4000), url: text(block.url, 500), label: text(block.label, 80), divider: block.divider !== false, spacing: block.spacing === "large" ? "large" : "small" })).filter(block => block.type === "separator" || (block.type === "text" && block.content) || (block.type === "image" && block.url) || (block.type === "button" && block.label && block.url)) }
    };
}

function buildMessagePayload(draft) {
    if (draft.format === "embed") {
        const embed = { ...draft.payload.embed };
        if (embed.timestamp) embed.timestamp = new Date().toISOString();
        else delete embed.timestamp;
        return { embeds: [embed], allowed_mentions: { parse: [] } };
    }
    const components = draft.payload.blocks.map(block => {
        if (block.type === "text") return { type: 10, content: block.content };
        if (block.type === "separator") return { type: 14, divider: block.divider !== false, spacing: block.spacing === "large" ? 2 : 1 };
        if (block.type === "image") return { type: 12, items: [{ media: { url: block.url } }] };
        if (block.type === "button") return { type: 1, components: [{ type: 2, style: 5, label: block.label, url: block.url }] };
        return null;
    }).filter(Boolean);
    if (draft.payload.title) components.unshift({ type: 10, content: "# " + draft.payload.title });
    return {
        flags: COMPONENTS_V2_FLAG,
        components: [{ type: 17, accent_color: draft.payload.accentColor ?? 0x8A2BE2, components }],
        allowed_mentions: { parse: [] }
    };
}

module.exports = { COMPONENTS_V2_FLAG, validateMessageDraft, buildMessagePayload };
