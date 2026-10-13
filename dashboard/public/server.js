const guildId = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) || "");
const categoriesOrder = ["Comunidad", "Moderación", "Servidor", "Economía y XP"];
const nav = document.querySelector("#module-nav");
const content = document.querySelector("#module-content");
const notice = document.querySelector("#notice");
let csrfToken = "";
let resources = { channels: [], roles: [] };
let configState = null;
let currentModule = "";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("notice-error", isError);
    notice.hidden = false;
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => { notice.hidden = true; }, 5000);
}

async function api(url, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    if (!["GET", "HEAD"].includes((options.method || "GET").toUpperCase())) headers["x-csrf-token"] = csrfToken;
    const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) window.location.assign("/");
    if (!response.ok) throw new Error(result.error || "La solicitud no se pudo completar.");
    return result;
}

function getNested(value, key) {
    return key.split(".").reduce((cursor, part) => cursor?.[part], value);
}

function optionsFor(field) {
    if (field.type === "role" || field.type === "role-list") return resources.roles.map(role => ({ id: role.id, name: role.name }));
    if (!["channel", "channel-list", "voice", "category"].includes(field.type)) return [];
    const allowedTypes = {
        category: [4],
        voice: [2, 13],
        channel: [0, 5, 15, 16],
        "channel-list": [0, 5, 15, 16]
    }[field.type];
    const filteredTypes = field.channelTypes || allowedTypes;
    return resources.channels.filter(channel => filteredTypes.includes(channel.type)).map(channel => ({ id: channel.id, name: channel.name }));
}

function renderField(field, value, prefix = "") {
    const id = `field-${prefix}${field.name}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    const required = field.optional ? "" : "required";
    const safeValue = value ?? field.default ?? "";
    if (field.type === "boolean") {
        return `<label class="field checkbox-field" for="${id}"><span><strong>${escapeHtml(field.label)}</strong></span><input id="${id}" name="${escapeHtml(field.name)}" type="checkbox" ${value ? "checked" : ""}></label>`;
    }
    if (field.type === "select") {
        const options = field.options.map(option => `<option value="${escapeHtml(option)}" ${safeValue === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" ${required}><option value="">Elige una opción</option>${options}</select></label>`;
    }
    if (["channel", "voice", "category", "role"].includes(field.type)) {
        const options = optionsFor(field);
        const current = String(safeValue || "");
        const hasCurrent = options.some(option => option.id === current);
        const blank = field.optional ? `<option value="">Sin asignar</option>` : `<option value="">Elige una opción</option>`;
        const stale = current && !hasCurrent ? `<option value="${escapeHtml(current)}" selected>ID guardado: ${escapeHtml(current)}</option>` : "";
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" ${required}>${blank}${stale}${options.map(option => `<option value="${escapeHtml(option.id)}" ${current === option.id ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}</select></label>`;
    }
    if (["channel-list", "role-list"].includes(field.type)) {
        const values = Array.isArray(value) ? value.map(String) : [];
        const options = optionsFor(field);
        const stale = values.filter(current => !options.some(option => option.id === current)).map(current => `<option value="${escapeHtml(current)}" selected>ID guardado: ${escapeHtml(current)}</option>`).join("");
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${escapeHtml(field.name)}" multiple size="5">${stale}${options.map(option => `<option value="${escapeHtml(option.id)}" ${values.includes(option.id) ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}</select><small>Mantén Ctrl o Cmd para seleccionar varios.</small></label>`;
    }
    if (["string-list", "json", "setups"].includes(field.type)) {
        let text = "";
        if (field.type === "string-list") text = Array.isArray(value) ? value.join("\n") : "";
        else text = JSON.stringify(value ?? (field.type === "setups" ? [] : {}), null, 2);
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><textarea id="${id}" name="${escapeHtml(field.name)}" rows="${field.type === "setups" ? 10 : 5}" spellcheck="false" ${required}>${escapeHtml(text)}</textarea>${field.type === "setups" ? "<small>Usa una lista JSON con categoryId, creatorChannelId, panelChannelId y panelMessageId por configuración.</small>" : ""}</label>`;
    }
    if (field.type === "textarea") {
        return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><textarea id="${id}" name="${escapeHtml(field.name)}" maxlength="${field.maxLength || 4000}" rows="5" ${required}>${escapeHtml(safeValue)}</textarea></label>`;
    }
    const inputType = field.type === "number" ? "number" : field.type === "url" ? "url" : field.type === "color" ? "text" : "text";
    const minMax = field.type === "number" ? `min="${field.min ?? 0}" ${field.max !== undefined ? `max="${field.max}"` : ""} step="1"` : "";
    return `<label class="field" for="${id}"><span>${escapeHtml(field.label)}</span><input id="${id}" name="${escapeHtml(field.name)}" type="${inputType}" value="${escapeHtml(safeValue)}" maxlength="${field.maxLength || 2000}" ${minMax} ${required}></label>`;
}

function readForm(form, fields) {
    const result = {};
    for (const field of fields) {
        const element = form.elements.namedItem(field.name);
        if (!element) continue;
        let value;
        if (field.type === "boolean") value = element.checked;
        else if (["channel-list", "role-list"].includes(field.type)) value = [...element.selectedOptions].map(option => option.value);
        else if (field.type === "string-list") value = element.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
        else if (["json", "setups"].includes(field.type)) {
            try { value = JSON.parse(element.value); } catch { throw new Error(`${field.label}: revisa el JSON.`); }
        } else if (field.type === "number") value = Number(element.value);
        else value = element.value;
        result[field.name] = value;
    }
    return result;
}

function makeNav(modules) {
    nav.replaceChildren();
    const all = [...Object.entries(modules.configurations), ...Object.entries(modules.lists)];
    for (const category of categoriesOrder) {
        const group = all.filter(([, definition]) => definition.category === category);
        if (!group.length) continue;
        const heading = document.createElement("div");
        heading.className = "nav-heading";
        heading.textContent = category;
        nav.append(heading);
        for (const [key, definition] of group) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nav-item";
            button.textContent = definition.title;
            button.dataset.module = key;
            button.addEventListener("click", () => renderModule(key, modules));
            nav.append(button);
        }
    }
}

function renderModule(key, modules) {
    currentModule = key;
    nav.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.module === key));
    const isList = Boolean(modules.lists[key]);
    const definition = isList ? modules.lists[key] : modules.configurations[key];
    document.querySelector("#page-title").textContent = definition.title;
    if (isList) return renderList(key, definition);

    const data = configState.configurations[key] || { configured: false };
    const formFields = definition.fields.map(field => renderField(field, getNested(data, field.name))).join("");
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div><span class="status-pill ${data.configured ? "configured" : "unconfigured"}">${data.configured ? "Configurado" : "Sin configurar"}</span></div><p class="card-description">Los cambios se guardan en la configuración del servidor y los canales y roles existentes se conservan.</p><form id="settings-form" class="fields-grid">${formFields}<div class="form-actions"><button class="primary-button" type="submit">Guardar cambios</button></div></form></article>`;
    content.querySelector("#settings-form").addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            const payload = readForm(event.currentTarget, definition.fields);
            const result = await api(`/api/guilds/${encodeURIComponent(guildId)}/config/${encodeURIComponent(key)}`, {
                method: "PUT", body: JSON.stringify(payload)
            });
            configState.configurations[key] = { ...result.configuration, configured: true };
            showNotice("Configuración guardada.");
            renderModule(key, modules);
        } catch (error) {
            showNotice(error.message, true);
        } finally {
            button.disabled = false;
        }
    });
}

function renderList(key, definition, editItem = null) {
    const records = configState.lists[key] || [];
    const editing = Boolean(editItem);
    const form = `<form id="list-form" class="fields-grid">${definition.fields.map(field => renderField(field, getNested(editItem, field.name), `${key}-`)).join("")}<div class="form-actions"><button class="primary-button" type="submit">${editing ? "Guardar elemento" : "Añadir elemento"}</button>${editing ? '<button class="quiet-button" id="cancel-edit" type="button">Cancelar</button>' : ""}</div></form>`;
    const rows = records.map(record => `<div class="record-row"><div class="record-title">${escapeHtml(record[definition.identity] ?? record.name ?? record.roleId ?? "Elemento")}</div><div class="record-actions"><button type="button" class="quiet-button" data-edit="${escapeHtml(record._id)}">Editar</button><button type="button" class="quiet-button danger-text" data-delete="${escapeHtml(record._id)}">Eliminar</button></div></div>`).join("");
    content.innerHTML = `<article class="settings-card"><div class="card-heading"><div><div class="eyebrow">${escapeHtml(definition.category)}</div><h2>${escapeHtml(definition.title)}</h2></div></div><div class="records-list">${rows || '<p class="empty-state">Todavía no hay elementos configurados.</p>'}</div><div class="form-divider"></div><h3>${editing ? "Editar elemento" : "Añadir elemento"}</h3>${form}</article>`;

    content.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
        const record = records.find(item => item._id === button.dataset.edit);
        renderList(key, definition, record);
    }));
    content.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", async () => {
        if (!window.confirm("¿Eliminar este elemento de la configuración del servidor?")) return;
        try {
            await api(`/api/guilds/${encodeURIComponent(guildId)}/lists/${encodeURIComponent(key)}/${encodeURIComponent(button.dataset.delete)}`, { method: "DELETE" });
            configState.lists[key] = records.filter(item => item._id !== button.dataset.delete);
            renderList(key, definition);
            showNotice("Elemento eliminado.");
        } catch (error) { showNotice(error.message, true); }
    }));
    content.querySelector("#list-form").addEventListener("submit", async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            const payload = readForm(event.currentTarget, definition.fields);
            const url = `/api/guilds/${encodeURIComponent(guildId)}/lists/${encodeURIComponent(key)}${editing ? `/${encodeURIComponent(editItem._id)}` : ""}`;
            const result = await api(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
            if (editing) configState.lists[key] = records.map(item => item._id === editItem._id ? result.item : item);
            else configState.lists[key] = [...records, result.item];
            renderList(key, definition);
            showNotice(editing ? "Elemento actualizado." : "Elemento añadido.");
        } catch (error) { showNotice(error.message, true); }
        finally { button.disabled = false; }
    });
    content.querySelector("#cancel-edit")?.addEventListener("click", () => renderList(key, definition));
}

async function initialize() {
    try {
        const sessionResult = await api("/api/me");
        if (!sessionResult.user) return window.location.assign("/");
        csrfToken = sessionResult.csrfToken;
        document.querySelector("#user-name").textContent = sessionResult.user.username;
        const [guildsResult, resourcesResult, configResult] = await Promise.all([
            api("/api/guilds"),
            api(`/api/guilds/${encodeURIComponent(guildId)}/resources`),
            api(`/api/guilds/${encodeURIComponent(guildId)}/config`)
        ]);
        const guild = guildsResult.guilds.find(item => item.id === guildId);
        document.querySelector("#server-name").textContent = guild?.name || "Servidor de Discord";
        resources = resourcesResult;
        configState = configResult;
        makeNav(configResult.modules);
        const first = [...Object.keys(configResult.modules.configurations), ...Object.keys(configResult.modules.lists)][0];
        if (first) renderModule(first, configResult.modules);
    } catch (error) {
        content.innerHTML = `<div class="loading-card error">${escapeHtml(error.message)} <a href="/">Volver a elegir servidor</a></div>`;
    }
}

document.querySelector("#logout").addEventListener("click", async () => {
    try {
        await api("/auth/logout", { method: "POST" });
        window.location.assign("/");
    } catch (error) { showNotice(error.message, true); }
});

initialize();
